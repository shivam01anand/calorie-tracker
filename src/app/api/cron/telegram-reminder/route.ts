import { NextRequest, NextResponse } from 'next/server'
import { generateDailyReminder } from '@/lib/gemini'
import { formatIndiaDate } from '@/lib/profile'
import { dailyCoachContext, getFoodLogsByDates, summarizeFoodLogs } from '@/lib/food-log'
import { formatNightCheckIn, sendTelegramMessage } from '@/lib/telegram'

export const maxDuration = 60

function dateOffset(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return formatIndiaDate(date)
}

async function run(request: NextRequest) {
  if (process.env.CRON_SECRET && request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ sent: false, reason: 'Telegram is not configured' })
  }

  const dates = [dateOffset(-2), dateOffset(-1), dateOffset(0)]
  const logs = await getFoodLogsByDates(dates)
  const today = dates[2]
  const todayLogs = logs.filter((log) => log.date === today)
  const earlierLogs = logs.filter((log) => log.date !== today)

  const recentContext = earlierLogs.map((log) =>
    `${log.date}: ${log.raw_input} (~${log.total_protein}g protein)`
  ).join('\n')
  const hook = await generateDailyReminder(dailyCoachContext(todayLogs), recentContext)
  await sendTelegramMessage(chatId, formatNightCheckIn(hook, summarizeFoodLogs(todayLogs)))
  return NextResponse.json({ sent: true, existingEntries: todayLogs.length })
}

export async function GET(request: NextRequest) {
  try {
    return await run(request)
  } catch (error) {
    console.error('Telegram reminder error:', error)
    return NextResponse.json({ error: 'Reminder failed' }, { status: 500 })
  }
}

export const POST = GET
