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
import { interpretCoachInput, transcribeVoice } from '@/lib/gemini'
import { formatIndiaDate, getIndiaHour } from '@/lib/profile'
import {
  downloadTelegramVoice,
  formatCoachReply,
  formatLiveCoachMessage,
  formatTodayCoachMessage,
  sendTelegramMessage,
  showTyping,
  telegramLogId,
  type TelegramUpdate,
} from '@/lib/telegram'

export const runtime = 'nodejs'
export const maxDuration = 60

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

No grades. No guilt. No “starting Monday.”`, replyOptions)
  }
  if (command === '/goals') {
    return sendTelegramMessage(chatId, `<b>Your north star</b>
Build visible muscle while slowly getting leaner.

Working guide:
• Protein floor: 120g
• Stretch zone: 120–145g
• Energy guide: roughly 2,200–2,450 kcal

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

  try {
    const command = message.text?.trim().split(/\s+/)[0].toLowerCase().split('@')[0]
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

    const messageDate = new Date(message.date * 1000)
    const date = formatIndiaDate(messageDate)
    const indiaHour = getIndiaHour(messageDate)
    const [logsBefore, conversationBefore] = await Promise.all([
      getFoodLogsForDate(date),
      getCoachMessagesForDate({
        chatId: message.chat.id,
        date,
        excludeSourceMessageId: message.message_id,
      }),
    ])
    await saveCoachMessage({
      chatId: message.chat.id,
      date,
      sourceMessageId: message.message_id,
      role: 'user',
      kind: 'other',
      content: rawInput,
    })
    const memory = `${dailyCoachContext(logsBefore)}\n\nConversation earlier today:\n${coachConversationContext(conversationBefore)}`
    const interpretation = await interpretCoachInput(rawInput, memory, indiaHour)
    await saveCoachMessage({
      chatId: message.chat.id,
      date,
      sourceMessageId: message.message_id,
      role: 'user',
      kind: interpretation.intent,
      content: rawInput,
    })

    if (interpretation.intent !== 'food_log' || !interpretation.analysis) {
      if (!interpretation.reply) throw new Error('Coach reply was not available')
      await sendAndRemember({
        chatId: message.chat.id,
        date,
        sourceMessageId: message.message_id,
        kind: interpretation.intent,
        text: formatCoachReply(interpretation.reply, summarizeFoodLogs(logsBefore), indiaHour),
      })
      return NextResponse.json({ ok: true })
    }

    const log = await createFoodLog({
      rawInput,
      date,
      id: telegramLogId(message.chat.id, message.message_id),
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
      sourceMessageId: message.message_id,
      kind: 'food_log',
      text: coachMessage,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    const errorMessage = 'I caught your note, but tripped while making sense of it. Nothing is wrong with your answer—please send it once more. 🌿'
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
