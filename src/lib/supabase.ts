import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export interface FoodLog {
  id: string
  created_at: string
  date: string
  raw_input: string
  parsed_meals: ParsedMeal[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  insights: string
}

export interface ParsedMeal {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface Meal {
  id: string
  created_at: string
  name: string
  name_hindi?: string
  recipe_link?: string
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  tags: string[]
  avg_calories: number
  avg_protein: number
  avg_carbs: number
  avg_fat: number
  is_suggested: boolean
}

export interface WeeklyPlan {
  id: string
  created_at: string
  week_start: string
  plan: {
    [day: string]: {
      breakfast?: string
      lunch?: string
      dinner?: string
      snacks?: string[]
    }
  }
}

export interface UserProfile {
  id: string
  name: string
  age: number
  weight_kg: number
  height_cm: number
  goal: string
  daily_calorie_target: number
  daily_protein_target: number
}

export interface WeeklyAnalysis {
  id: string
  created_at: string
  week_start: string
  analysis: string
  missing_nutrients: string[]
  recommendations: string[]
}
