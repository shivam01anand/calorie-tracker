import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createFoodLog, getFoodLogsForDate, recalculateFoodLog } from '@/lib/food-log'
import { formatIndiaDate } from '@/lib/profile'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { raw_input, date } = await request.json()
    const log = await createFoodLog({ rawInput: raw_input || '', date: date || formatIndiaDate() })
    return NextResponse.json(log)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong'
    console.error('POST /api/log:', message)
    return NextResponse.json({ error: message }, { status: message.startsWith('Please') ? 400 : 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || formatIndiaDate()
    return NextResponse.json(await getFoodLogsForDate(date))
  } catch (error) {
    console.error('GET /api/log:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  try {
    return NextResponse.json(await recalculateFoodLog(id))
  } catch (error) {
    console.error('PATCH /api/log:', error)
    return NextResponse.json({ error: 'Failed to recalculate log' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  const { error } = await supabase.from('food_logs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Failed to delete log' }, { status: 500 })
  return NextResponse.json({ success: true })
}
