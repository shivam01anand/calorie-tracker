import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parseFood, getNerdyInsights } from '@/lib/gemini'
import { formatDate } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { raw_input, date } = await request.json()

    if (!raw_input || raw_input.trim() === '') {
      return NextResponse.json({ error: 'Please enter what you ate' }, { status: 400 })
    }

    const logDate = date || formatDate(new Date())

    // Parse food with Gemini
    const parsed = await parseFood(raw_input)

    // Get nerdy insights
    const insights = await getNerdyInsights(parsed.meals)

    // Save to database
    const { data, error } = await supabase
      .from('food_logs')
      .insert({
        date: logDate,
        raw_input: raw_input.trim(),
        parsed_meals: parsed.meals,
        total_calories: parsed.total.calories,
        total_protein: parsed.total.protein,
        total_carbs: parsed.total.carbs,
        total_fat: parsed.total.fat,
        insights,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to save log', details: error.message, code: error.code }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || formatDate(new Date())

    const { data, error } = await supabase
      .from('food_logs')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('food_logs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to delete log' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
