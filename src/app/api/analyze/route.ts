import { NextRequest, NextResponse } from 'next/server'
import { getMacroAnalysis } from '@/lib/gemini'

const TARGETS = {
  calories: 2500,
  protein: 117,
  carbs: 340,
  fat: 62,
}

export async function POST(request: NextRequest) {
  try {
    const { meals, totals } = await request.json()

    if (!meals || !totals) {
      return NextResponse.json({ error: 'Meals and totals required' }, { status: 400 })
    }

    const analysis = await getMacroAnalysis(meals, totals, TARGETS)

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
