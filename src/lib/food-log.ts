import { analyzeFoodDay, type DayAnalysis } from './gemini'
import { supabase, type FoodLog } from './supabase'
import { formatIndiaDate } from './profile'
import { isSealed, openJson, sealJson } from './crypto'

export interface StoredFoodLog extends FoodLog {
  coaching?: DayAnalysis['coaching']
  transcript?: string
}

interface ProtectedFoodPayload {
  raw_input: string
  parsed_meals: FoodLog['parsed_meals']
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  insights: string
}

export function hydrateFoodLog(row: FoodLog): StoredFoodLog {
  if (!isSealed(row.insights)) return row
  const payload = openJson<ProtectedFoodPayload>(row.insights)
  return { ...row, ...payload }
}

export async function getFoodLogsForDate(date = formatIndiaDate()) {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((row) => hydrateFoodLog(row as FoodLog))
}

export async function getFoodLogsByDates(dates: string[]) {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .in('date', dates)
    .order('date', { ascending: true })
  if (error) throw error
  return (data || []).map((row) => hydrateFoodLog(row as FoodLog))
}

export async function getAllFoodLogs() {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((row) => hydrateFoodLog(row as FoodLog))
}

export async function createFoodLog({
  rawInput,
  date = formatIndiaDate(),
  id,
  transcript,
}: {
  rawInput: string
  date?: string
  id?: string
  transcript?: string
}): Promise<StoredFoodLog> {
  const cleanInput = rawInput.trim()
  if (!cleanInput) throw new Error('Please tell me what you ate')

  if (id) {
    const { data: existing } = await supabase.from('food_logs').select('*').eq('id', id).maybeSingle()
    if (existing) return hydrateFoodLog(existing as FoodLog)
  }

  const analysis = await analyzeFoodDay(cleanInput)
  const insights = JSON.stringify({
    version: 2,
    coaching: analysis.coaching,
    transcript: transcript || null,
  })
  const protectedPayload: ProtectedFoodPayload = {
    raw_input: cleanInput,
    parsed_meals: analysis.meals,
    total_calories: analysis.total.calories,
    total_protein: analysis.total.protein,
    total_carbs: analysis.total.carbs,
    total_fat: analysis.total.fat,
    insights,
  }
  const encrypt = Boolean(process.env.DATA_ENCRYPTION_KEY)

  const { data, error } = await supabase
    .from('food_logs')
    .insert({
      ...(id ? { id } : {}),
      date,
      raw_input: encrypt ? 'Private food note' : cleanInput,
      parsed_meals: encrypt ? [] : analysis.meals,
      total_calories: encrypt ? 0 : analysis.total.calories,
      total_protein: encrypt ? 0 : analysis.total.protein,
      total_carbs: encrypt ? 0 : analysis.total.carbs,
      total_fat: encrypt ? 0 : analysis.total.fat,
      insights: encrypt ? sealJson(protectedPayload) : insights,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to save log: ${error.message}`)
  return {
    ...hydrateFoodLog(data as FoodLog),
    coaching: analysis.coaching,
    transcript,
  } as StoredFoodLog
}

export function readCoaching(log: FoodLog): DayAnalysis['coaching'] | null {
  const hydrated = hydrateFoodLog(log)
  if (!hydrated.insights) return null
  try {
    const parsed = JSON.parse(hydrated.insights) as { coaching?: DayAnalysis['coaching'] }
    return parsed.coaching || null
  } catch {
    return null
  }
}
