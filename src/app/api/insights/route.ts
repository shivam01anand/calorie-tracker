import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateWeeklyAnalysis } from '@/lib/gemini'
import { getWeekStart, formatDate } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStartParam = searchParams.get('week_start')

    const weekStart = weekStartParam || getWeekStart(new Date())

    const { data, error } = await supabase
      .from('weekly_analysis')
      .select('*')
      .eq('week_start', weekStart)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch analysis' }, { status: 500 })
    }

    return NextResponse.json(data || null)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { week_start } = await request.json()
    const weekStart = week_start || getWeekStart(new Date())

    // Fetch logs for the week
    const weekDates: string[] = []
    const start = new Date(weekStart)
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      weekDates.push(formatDate(d))
    }

    const { data: logs, error: logsError } = await supabase
      .from('food_logs')
      .select('*')
      .in('date', weekDates)
      .order('date', { ascending: true })

    if (logsError) {
      console.error('Supabase error:', logsError)
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }

    if (!logs || logs.length === 0) {
      return NextResponse.json({ error: 'No logs found for this week' }, { status: 400 })
    }

    // Generate analysis with Gemini
    const analysisResult = await generateWeeklyAnalysis(
      logs.map((l) => ({
        date: l.date,
        parsed_meals: l.parsed_meals,
        total_calories: l.total_calories,
        total_protein: l.total_protein,
      }))
    )

    // Save analysis
    const { data, error } = await supabase
      .from('weekly_analysis')
      .insert({
        week_start: weekStart,
        analysis: analysisResult.analysis,
        missing_nutrients: analysisResult.missing_nutrients,
        recommendations: analysisResult.recommendations,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
