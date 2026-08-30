import { NextRequest, NextResponse } from 'next/server'
import { getMacroAnalysis } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const { meals, totals } = await request.json()
    if (!meals || !totals) return NextResponse.json({ error: 'Meals and totals required' }, { status: 400 })
    return NextResponse.json({ analysis: await getMacroAnalysis(meals, totals) })
  } catch (error) {
    console.error('POST /api/analyze:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
