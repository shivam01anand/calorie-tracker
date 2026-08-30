import { analyzeFoodDay, type DayAnalysis } from './gemini'
import { supabase, type FoodLog } from './supabase'
import { formatIndiaDate } from './profile'
import { isSealed, openJson, sealJson } from './crypto'

export interface StoredFoodLog extends FoodLog {
  coaching?: DayAnalysis['coaching']
  transcript?: string
}

export interface DailyFoodSummary {
  entries: number
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  foods: string[]
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

export function summarizeFoodLogs(logs: StoredFoodLog[]): DailyFoodSummary {
  return logs.reduce<DailyFoodSummary>((summary, log) => {
    summary.entries += 1
    summary.calories += log.total_calories
    summary.protein += log.total_protein
    summary.carbs += log.total_carbs
    summary.fat += log.total_fat
    summary.fiber += (log.parsed_meals || []).reduce((sum, meal) => sum + (meal.fiber || 0), 0)
    summary.foods.push(...(log.parsed_meals || []).map((meal) => meal.name).filter(Boolean))
    return summary
  }, {
    entries: 0,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    foods: [],
  })
}

export function dailyCoachContext(logs: StoredFoodLog[]) {
  const summary = summarizeFoodLogs(logs)
  const entries = logs
    .slice()
    .reverse()
    .map((log) => `- ${log.raw_input} (~${log.total_calories} kcal, ${log.total_protein}g protein)`)
    .join('\n')

  return `Already logged today: ${summary.entries} update${summary.entries === 1 ? '' : 's'}.
Cumulative estimate before this message: ${summary.calories} kcal, ${summary.protein}g protein, ${summary.carbs}g carbs, ${summary.fat}g fat, ${summary.fiber}g fibre.
${entries || '- Nothing logged yet.'}`
}

export function aggregateFoodLogsByDate(logs: StoredFoodLog[]) {
  const byDate = new Map<string, StoredFoodLog[]>()
  for (const log of logs) byDate.set(log.date, [...(byDate.get(log.date) || []), log])

  return [...byDate.entries()].map(([date, dateLogs]) => {
    const summary = summarizeFoodLogs(dateLogs)
    return {
      date,
      parsed_meals: dateLogs.flatMap((log) => log.parsed_meals || []),
      total_calories: summary.calories,
      total_protein: summary.protein,
    }
  })
}

function totalsFromMeals(meals: FoodLog['parsed_meals']) {
  return meals.reduce((totals, meal) => ({
    calories: totals.calories + (meal.calories || 0),
    protein: totals.protein + (meal.protein || 0),
    carbs: totals.carbs + (meal.carbs || 0),
    fat: totals.fat + (meal.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
}

export async function recalculateFoodLog(id: string) {
  const { data: row, error: readError } = await supabase
    .from('food_logs')
    .select('*')
    .eq('id', id)
    .single()
  if (readError) throw readError

  const log = hydrateFoodLog(row as FoodLog)
  const total = totalsFromMeals(log.parsed_meals || [])
  const protectedPayload: ProtectedFoodPayload = {
    raw_input: log.raw_input,
    parsed_meals: log.parsed_meals || [],
    total_calories: total.calories,
    total_protein: total.protein,
    total_carbs: total.carbs,
    total_fat: total.fat,
    insights: log.insights,
  }
  const encrypt = Boolean(process.env.DATA_ENCRYPTION_KEY)
  const { data, error } = await supabase
    .from('food_logs')
    .update({
      raw_input: encrypt ? 'Private food note' : log.raw_input,
      parsed_meals: encrypt ? [] : log.parsed_meals,
      total_calories: encrypt ? 0 : total.calories,
      total_protein: encrypt ? 0 : total.protein,
      total_carbs: encrypt ? 0 : total.carbs,
      total_fat: encrypt ? 0 : total.fat,
      insights: encrypt ? sealJson(protectedPayload) : log.insights,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return hydrateFoodLog(data as FoodLog)
}

export async function createFoodLog({
  rawInput,
  date = formatIndiaDate(),
  id,
  transcript,
  analysis: suppliedAnalysis,
}: {
  rawInput: string
  date?: string
  id?: string
  transcript?: string
  analysis?: DayAnalysis
}): Promise<StoredFoodLog> {
  const cleanInput = rawInput.trim()
  if (!cleanInput) throw new Error('Please tell me what you ate')

  if (id) {
    const { data: existing } = await supabase.from('food_logs').select('*').eq('id', id).maybeSingle()
    if (existing) return hydrateFoodLog(existing as FoodLog)
  }

  const analysis = suppliedAnalysis || await analyzeFoodDay(cleanInput)
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
