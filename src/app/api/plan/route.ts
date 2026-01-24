import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getWeekStart } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStartParam = searchParams.get('week_start')

    const weekStart = weekStartParam || getWeekStart(new Date())

    const { data, error } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('week_start', weekStart)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 })
    }

    // Return empty plan if none exists
    if (!data) {
      return NextResponse.json({
        week_start: weekStart,
        plan: {
          monday: {},
          tuesday: {},
          wednesday: {},
          thursday: {},
          friday: {},
          saturday: {},
          sunday: {},
        },
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { week_start, plan } = await request.json()

    if (!week_start || !plan) {
      return NextResponse.json({ error: 'week_start and plan are required' }, { status: 400 })
    }

    // Upsert the plan (insert or update)
    const { data, error } = await supabase
      .from('weekly_plans')
      .upsert(
        { week_start, plan },
        { onConflict: 'week_start' }
      )
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to save plan' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
