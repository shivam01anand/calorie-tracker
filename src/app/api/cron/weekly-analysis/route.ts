import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { aggregateFoodLogsByDate, getFoodLogsByDates } from '@/lib/food-log'
import { generateWeeklyAnalysis } from '@/lib/gemini'
import { sendWeeklyCoachReport } from '@/lib/slack'
import { getWeekStart, formatDate } from '@/lib/utils'
import { sealJson } from '@/lib/crypto'

export const maxDuration = 120

// This endpoint should be called weekly by Vercel Cron
// cron: 0 20 * * 0 (every Sunday at 8 PM)

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (optional, for security)
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the week that just ended (last Monday to today)
    const today = new Date()
    const weekStart = getWeekStart(today)

    // Fetch logs for the week
    const weekDates: string[] = []
    const start = new Date(weekStart)
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      weekDates.push(formatDate(d))
    }

    const logs = await getFoodLogsByDates(weekDates)

    if (logs.length === 0) {
      return NextResponse.json({
        analysis_generated: false,
        message: 'No logs found for this week',
      })
    }

    // Weekly reports prefer GPT-5.5 via OpenRouter and fall back to Gemini.
    const dailyLogs = aggregateFoodLogsByDate(logs)
    const analysisResult = await generateWeeklyAnalysis(dailyLogs)

    // Save the richer report in the existing analysis field to avoid a destructive schema migration.
    const encrypt = Boolean(process.env.DATA_ENCRYPTION_KEY)
    const { data, error } = await supabase
      .from('weekly_analysis')
      .insert({
        week_start: weekStart,
        analysis: encrypt ? sealJson(analysisResult) : JSON.stringify(analysisResult),
        missing_nutrients: encrypt ? [] : analysisResult.missing_nutrients,
        recommendations: encrypt ? [] : analysisResult.recommendations,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 })
    }

    // Send Slack notification
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://calorie-tracker-mocha-two.vercel.app'
    const slackSent = await sendWeeklyCoachReport(analysisResult, {
      loggedDays: dailyLogs.length,
      proteinDays: dailyLogs.filter((log) => log.total_protein >= 120).length,
    }, siteUrl)

    return NextResponse.json({
      analysis_generated: true,
      slack_sent: slackSent,
      analysis_id: data.id,
    })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}
