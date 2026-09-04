import { NextRequest, NextResponse } from 'next/server'
import {
  coachConversationContext,
  getCoachMessagesForDate,
  saveCoachMessage,
  type CoachMessageKind,
} from '@/lib/conversation'
import {
  createFoodLog,
  dailyCoachContext,
  getFoodLogsForDate,
  summarizeFoodLogs,
} from '@/lib/food-log'
import { answerPrivateQuestion, interpretCoachInput, transcribeVoice } from '@/lib/gemini'
import { formatIndiaDate, getIndiaHour } from '@/lib/profile'
import {
  downloadTelegramVoice,
  formatCoachReply,
  formatLiveCoachMessage,
  formatPrivateQuestionReply,
  formatTodayCoachMessage,
  sendTelegramMessage,
  showTyping,
  telegramLogId,
  type TelegramMessage,
  type TelegramUpdate,
} from '@/lib/telegram'

export const runtime = 'nodejs'
export const maxDuration = 60

const SOL_LONG_INPUT_MIN_CHARS = 40

function privateQuestionFrom(text?: string) {
  const trimmed = text?.trim() || ''
  if (!/^qq(?:\s|$)/i.test(trimmed)) return null
  return trimmed.replace(/^qq(?:\s+|$)/i, '').trim()
}

function isAllowed(chatId: number) {
  const allowed = process.env.TELEGRAM_CHAT_ID
  return !allowed || String(chatId) === allowed
}

async function commandReply(chatId: number, command: string, messageId: number) {
  const replyOptions = { replyToMessageId: messageId }
  if (command === '/start') {
    return sendTelegramMessage(chatId, `🌿 <b>Calypso is awake.</b>

Text me whenever you eat—not just at night. Every update gets a macro estimate, your running day, and one useful next move.

At 11 PM I’ll first check what’s already here, then ask if anything is missing. Messy text and voice notes both work.

Start a message with <code>qq</code> for a private GPT-5.6 side question that I won’t save.

No grades. No guilt. No “starting Monday.”`, replyOptions)
  }
  if (command === '/goals') {
    return sendTelegramMessage(chatId, `<b>Your north star</b>
Build visible muscle while slowly getting leaner.

Working guide:
• Protein floor: 120g
• Stretch zone: 120–145g
• Energy guide: roughly 2,200–2,450 kcal
• Carbs working range: 250–325g
• Fat working range: 55–75g
• Fibre direction: around 30g

These are coaching ranges, not medical prescriptions. We’ll learn from your real weeks.`, replyOptions)
  }
  if (command === '/today') {
    const data = await getFoodLogsForDate()
    return sendTelegramMessage(
      chatId,
      formatTodayCoachMessage(summarizeFoodLogs(data), getIndiaHour()),
      replyOptions,
    )
  }
  return sendTelegramMessage(chatId, `Send what you ate as text or a voice note.

/today — today’s rough totals
/goals — your current north star
/retry — reprocess your last saved message
qq your question — private GPT-5.6 answer, not saved
/help — show this note`, replyOptions)
}

async function sendAndRemember({
  chatId,
  date,
  sourceMessageId,
  kind,
  text,
}: {
  chatId: number
  date: string
  sourceMessageId: number
  kind: CoachMessageKind
  text: string
}) {
  await sendTelegramMessage(chatId, text, { replyToMessageId: sourceMessageId })
  await saveCoachMessage({
    chatId,
    date,
    sourceMessageId,
    role: 'assistant',
    kind,
    content: text,
  })
}

async function processCoachInput({
  message,
  rawInput,
  transcript,
  sourceMessageId = message.message_id,
  saveUserFirst = true,
  preferSol = false,
}: {
  message: TelegramMessage
  rawInput: string
  transcript?: string
  sourceMessageId?: number
  saveUserFirst?: boolean
  preferSol?: boolean
}) {
  const messageDate = new Date(message.date * 1000)
  const date = formatIndiaDate(messageDate)
  const indiaHour = getIndiaHour(messageDate)
  const [logsBefore, conversationBefore] = await Promise.all([
    getFoodLogsForDate(date),
    getCoachMessagesForDate({
      chatId: message.chat.id,
      date,
      excludeSourceMessageId: sourceMessageId,
    }),
  ])
  if (saveUserFirst) {
    await saveCoachMessage({
      chatId: message.chat.id,
      date,
      sourceMessageId,
      role: 'user',
      kind: 'other',
      content: rawInput,
    })
  }
  const memory = `${dailyCoachContext(logsBefore)}\n\nConversation earlier today:\n${coachConversationContext(conversationBefore)}`
  const interpretation = await interpretCoachInput(rawInput, memory, indiaHour, { preferSol })
  await saveCoachMessage({
    chatId: message.chat.id,
    date,
    sourceMessageId,
    role: 'user',
    kind: interpretation.intent,
    content: rawInput,
  })

  if (interpretation.intent !== 'food_log' || !interpretation.analysis) {
    if (!interpretation.reply) throw new Error('Coach reply was not available')
    await sendAndRemember({
      chatId: message.chat.id,
      date,
      sourceMessageId,
      kind: interpretation.intent,
      text: formatCoachReply(interpretation.reply, summarizeFoodLogs(logsBefore), indiaHour),
    })
    return
  }

  const log = await createFoodLog({
    rawInput,
    date,
    id: telegramLogId(message.chat.id, sourceMessageId),
    transcript,
    analysis: interpretation.analysis,
  })

  if (!log.coaching) throw new Error('Coach response was not available')
  const logsAfter = await getFoodLogsForDate(date)
  const coachMessage = formatLiveCoachMessage(log.coaching, {
    calories: log.total_calories,
    protein: log.total_protein,
    carbs: log.total_carbs,
    fat: log.total_fat,
    fiber: (log.parsed_meals || []).reduce((sum, meal) => sum + (meal.fiber || 0), 0),
  }, summarizeFoodLogs(logsAfter), indiaHour, transcript)
  await sendAndRemember({
    chatId: message.chat.id,
    date,
    sourceMessageId,
    kind: 'food_log',
    text: coachMessage,
  })
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!expectedSecret && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Telegram webhook is not configured' }, { status: 503 })
  }
  if (expectedSecret && request.headers.get('x-telegram-bot-api-secret-token') !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const update = await request.json() as TelegramUpdate
  const message = update.message
  if (!message) return NextResponse.json({ ok: true })
  if (!isAllowed(message.chat.id)) return NextResponse.json({ ok: true })
  const privateQuestion = privateQuestionFrom(message.text)

  try {
    const command = message.text?.trim().split(/\s+/)[0].toLowerCase().split('@')[0]
    if (command === '/retry') {
      await showTyping(message.chat.id)
      const date = formatIndiaDate(new Date(message.date * 1000))
      const history = await getCoachMessagesForDate({ chatId: message.chat.id, date, limit: 60 })
      const lastUser = history.slice().reverse().find((item) => item.role === 'user')
      if (!lastUser?.content || lastUser.source_message_id === undefined) {
        await sendTelegramMessage(
          message.chat.id,
          'I don’t have a saved message to retry yet. Send me the food or question normally. 🌿',
          { replyToMessageId: message.message_id },
        )
        return NextResponse.json({ ok: true })
      }
      await processCoachInput({
        message,
        rawInput: lastUser.content,
        sourceMessageId: lastUser.source_message_id,
        saveUserFirst: false,
      })
      return NextResponse.json({ ok: true })
    }
    if (command?.startsWith('/')) {
      await commandReply(message.chat.id, command, message.message_id)
      return NextResponse.json({ ok: true })
    }

    if (message.text?.trim().toLowerCase() === 'skip') {
      const date = formatIndiaDate(new Date(message.date * 1000))
      await saveCoachMessage({
        chatId: message.chat.id,
        date,
        sourceMessageId: message.message_id,
        role: 'user',
        kind: 'day_complete',
        content: 'skip',
      })
      await sendAndRemember({
        chatId: message.chat.id,
        date,
        sourceMessageId: message.message_id,
        kind: 'day_complete',
        text: 'Rest accepted. No debt created. I’ll meet you gently tomorrow. 🌙',
      })
      return NextResponse.json({ ok: true })
    }

    if (privateQuestion !== null) {
      await showTyping(message.chat.id).catch(() => undefined)
      if (!privateQuestion) {
        await sendTelegramMessage(
          message.chat.id,
          'Add your question after <code>qq</code>. Example: <code>qq is creatine worth it for me?</code>\n\n<i>This side quest won’t be saved.</i>',
          { replyToMessageId: message.message_id },
        )
        return NextResponse.json({ ok: true })
      }

      try {
        const answer = await answerPrivateQuestion(privateQuestion)
        await sendTelegramMessage(
          message.chat.id,
          formatPrivateQuestionReply(answer),
          { replyToMessageId: message.message_id },
        )
      } catch (error) {
        console.error('Private GPT-5.6 question failed:', error instanceof Error ? error.message : 'Unknown error')
        await sendTelegramMessage(
          message.chat.id,
          '🧠 The private side quest is temporarily unavailable. Nothing from it was saved—try the same <code>qq</code> again shortly.',
          { replyToMessageId: message.message_id },
        )
      }
      return NextResponse.json({ ok: true })
    }

    await showTyping(message.chat.id)
    let rawInput = message.text?.trim() || ''
    let transcript: string | undefined

    if (message.voice) {
      const voice = await downloadTelegramVoice(message.voice)
      transcript = await transcribeVoice(voice.audio, voice.mimeType)
      rawInput = transcript
    }

    if (!rawInput) {
      await sendTelegramMessage(
        message.chat.id,
        'Text or a voice note works beautifully. What did you eat today?',
        { replyToMessageId: message.message_id },
      )
      return NextResponse.json({ ok: true })
    }

    await processCoachInput({
      message,
      rawInput,
      transcript,
      preferSol: rawInput.trim().length >= SOL_LONG_INPUT_MIN_CHARS,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    if (privateQuestion !== null) {
      await sendTelegramMessage(
        message.chat.id,
        '🧠 That private side quest tripped before it could answer. Nothing was saved—please try again shortly.',
        { replyToMessageId: message.message_id },
      ).catch(() => undefined)
      return NextResponse.json({ ok: true })
    }
    const errorMessage = 'Calypso is unusually busy, but your message is safely remembered. Send /retry and I’ll process it without making you type it again. 🌿'
    await sendAndRemember({
      chatId: message.chat.id,
      date: formatIndiaDate(new Date(message.date * 1000)),
      sourceMessageId: message.message_id,
      kind: 'other',
      text: errorMessage,
    }).catch(() => undefined)
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  })
}
