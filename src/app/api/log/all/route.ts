import { NextResponse } from 'next/server'
import { getAllFoodLogs } from '@/lib/food-log'

export async function GET() {
  try {
    return NextResponse.json(await getAllFoodLogs())
  } catch (error) {
    console.error('GET /api/log/all:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}
