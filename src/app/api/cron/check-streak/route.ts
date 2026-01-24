import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendMissedDayNudge } from '@/lib/slack'
import { formatDate } from '@/lib/utils'

// This endpoint should be called daily by Vercel Cron
// cron: 0 9 * * * (every day at 9 AM)

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (optional, for security)
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if there was a log yesterday
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = formatDate(yesterday)

    const { data: logs, error } = await supabase
      .from('food_logs')
      .select('id')
      .eq('date', yesterdayStr)
      .limit(1)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to check logs' }, { status: 500 })
    }

    // If no logs yesterday, send a nudge
    if (!logs || logs.length === 0) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const sent = await sendMissedDayNudge(siteUrl)

      return NextResponse.json({
        nudge_sent: sent,
        message: sent ? 'Nudge sent successfully' : 'Failed to send nudge',
      })
    }

    return NextResponse.json({
      nudge_sent: false,
      message: 'User logged yesterday, no nudge needed',
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
