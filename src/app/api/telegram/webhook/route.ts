import { NextRequest, NextResponse } from 'next/server'
import { createFoodLog, getFoodLogsForDate } from '@/lib/food-log'
import { transcribeVoice } from '@/lib/gemini'
import { formatIndiaDate } from '@/lib/profile'
import {
  downloadTelegramVoice,
  formatDailyCoachMessage,
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

async function commandReply(chatId: number, command: string) {
  if (command === '/start') {
    return sendTelegramMessage(chatId, `🌿 <b>Fuel is awake.</b>

At 11 PM I’ll ask what fed you. Reply in messy text or send a voice note—I’ll turn it into a useful record and one loving next move.

No grades. No guilt. No “starting Monday.”`)
  }
  if (command === '/goals') {
    return sendTelegramMessage(chatId, `<b>Your north star</b>
Build visible muscle while slowly getting leaner.

Working guide:
• Protein floor: 120g
• Stretch zone: 120–145g
• Energy guide: roughly 2,200–2,450 kcal

These are coaching ranges, not medical prescriptions. We’ll learn from your real weeks.`)
  }
  if (command === '/today') {
    const data = await getFoodLogsForDate()
    const totals = data.reduce((sum, log) => ({
      protein: sum.protein + log.total_protein,
      calories: sum.calories + log.total_calories,
    }), { protein: 0, calories: 0 })
    return sendTelegramMessage(chatId, data.length
      ? `<b>Today so far</b>\n${data.length} note${data.length === 1 ? '' : 's'} · about ${totals.protein}g protein · ${totals.calories} kcal\n\nStill an estimate. Still useful.`
      : `Today is still an open page. Send one rough line or a voice note whenever you’re ready.`)
  }
  return sendTelegramMessage(chatId, `Send what you ate as text or a voice note.

/today — today’s rough totals
/goals — your current north star
/help — show this note`)
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
    const command = message.text?.trim().split(/\s+/)[0].toLowerCase()
    if (command?.startsWith('/')) {
      await commandReply(message.chat.id, command)
      return NextResponse.json({ ok: true })
    }

    if (message.text?.trim().toLowerCase() === 'skip') {
      await sendTelegramMessage(message.chat.id, 'Rest accepted. No debt created. I’ll meet you gently tomorrow. 🌙')
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
      await sendTelegramMessage(message.chat.id, 'Text or a voice note works beautifully. What did you eat today?')
      return NextResponse.json({ ok: true })
    }

    const log = await createFoodLog({
      rawInput,
      date: formatIndiaDate(new Date(message.date * 1000)),
      id: telegramLogId(message.chat.id, message.message_id),
      transcript,
    })

    if (!log.coaching) throw new Error('Coach response was not available')
    await sendTelegramMessage(
      message.chat.id,
      formatDailyCoachMessage(log.coaching, {
        calories: log.total_calories,
        protein: log.total_protein,
      }, transcript)
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    await sendTelegramMessage(
      message.chat.id,
      'I caught your note, but tripped while making sense of it. Nothing is wrong with your answer—please send it once more. 🌿'
    ).catch(() => undefined)
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  })
}
