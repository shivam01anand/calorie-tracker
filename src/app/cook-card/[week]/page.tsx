'use client'

import { useState, useEffect, use } from 'react'
import type { Meal } from '@/lib/supabase'
import { getWeekDays, getDayName, getDayNameHindi } from '@/lib/utils'

interface DayPlan {
  breakfast?: string
  lunch?: string
  dinner?: string
}

interface WeekPlan {
  [day: string]: DayPlan
}

interface PageProps {
  params: Promise<{ week: string }>
}

export default function CookCardPage({ params }: PageProps) {
  const { week } = use(params)
  const [plan, setPlan] = useState<WeekPlan>({})
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)

  const weekDays = getWeekDays(week)

  useEffect(() => {
    fetchData()
  }, [week])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [planRes, mealsRes] = await Promise.all([
        fetch(`/api/plan?week_start=${week}`),
        fetch('/api/meals'),
      ])

      if (planRes.ok) {
        const planData = await planRes.json()
        setPlan(planData.plan || {})
      }

      if (mealsRes.ok) {
        const mealsData = await mealsRes.json()
        setMeals(mealsData)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMealById = (id: string) => meals.find((m) => m.id === id)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--muted)]">Loading cook card...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center py-6">
        <h1 className="text-2xl font-bold text-[var(--accent)]">
          Weekly Menu / Hafte Ka Khana
        </h1>
        <p className="text-[var(--muted)] mt-1">
          Week of{' '}
          {new Date(week).toLocaleDateString('en-IN', {
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Cook Card */}
      <div
        id="cook-card"
        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden"
      >
        {/* Title Bar */}
        <div className="bg-[var(--accent)] text-[var(--background)] px-6 py-4">
          <h2 className="text-xl font-bold">This Week&apos;s Plan</h2>
          <p className="text-sm opacity-80">Is hafte ka khaana</p>
        </div>

        {/* Days */}
        <div className="divide-y divide-[var(--border)]">
          {weekDays.map((day) => {
            const dayKey = getDayName(day).toLowerCase()
            const dayPlan = plan[dayKey] || {}
            const breakfastMeal = dayPlan.breakfast ? getMealById(dayPlan.breakfast) : null
            const lunchMeal = dayPlan.lunch ? getMealById(dayPlan.lunch) : null
            const dinnerMeal = dayPlan.dinner ? getMealById(dayPlan.dinner) : null

            const hasMeals = breakfastMeal || lunchMeal || dinnerMeal

            if (!hasMeals) return null

            return (
              <div key={day} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-bold text-[var(--foreground)]">
                    {getDayName(day)}
                  </span>
                  <span className="text-sm text-[var(--muted)]">
                    ({getDayNameHindi(day)})
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(day).getDate()}/{new Date(day).getMonth() + 1}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {breakfastMeal && (
                    <div className="bg-[var(--background)] rounded-lg p-3">
                      <div className="text-xs text-yellow-400 font-medium mb-1">
                        Breakfast / Nashta
                      </div>
                      <div className="font-medium text-[var(--foreground)]">
                        {breakfastMeal.name}
                      </div>
                      {breakfastMeal.name_hindi && (
                        <div className="text-sm text-[var(--muted)]">
                          {breakfastMeal.name_hindi}
                        </div>
                      )}
                    </div>
                  )}

                  {lunchMeal && (
                    <div className="bg-[var(--background)] rounded-lg p-3">
                      <div className="text-xs text-blue-400 font-medium mb-1">
                        Lunch / Dopahar
                      </div>
                      <div className="font-medium text-[var(--foreground)]">
                        {lunchMeal.name}
                      </div>
                      {lunchMeal.name_hindi && (
                        <div className="text-sm text-[var(--muted)]">
                          {lunchMeal.name_hindi}
                        </div>
                      )}
                    </div>
                  )}

                  {dinnerMeal && (
                    <div className="bg-[var(--background)] rounded-lg p-3">
                      <div className="text-xs text-purple-400 font-medium mb-1">
                        Dinner / Raat
                      </div>
                      <div className="font-medium text-[var(--foreground)]">
                        {dinnerMeal.name}
                      </div>
                      {dinnerMeal.name_hindi && (
                        <div className="text-sm text-[var(--muted)]">
                          {dinnerMeal.name_hindi}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="bg-[var(--background)] px-6 py-3 text-center">
          <p className="text-xs text-[var(--muted)]">
            Generated with FUEL Tracker
          </p>
        </div>
      </div>

      {/* Share Instructions */}
      <div className="text-center text-sm text-[var(--muted)] space-y-2">
        <p>Screenshot this card and share on WhatsApp</p>
        <p className="text-xs">
          Tip: On iPhone, use full page screenshot. On Android, use scroll capture.
        </p>
      </div>

      {/* Grocery List */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="font-bold text-[var(--foreground)] mb-4">
          Unique Meals This Week / Is Hafte Ki List
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {Array.from(
            new Set(
              Object.values(plan)
                .flatMap((day) => [day.breakfast, day.lunch, day.dinner])
                .filter(Boolean)
            )
          ).map((mealId) => {
            const meal = getMealById(mealId as string)
            if (!meal) return null
            return (
              <div key={mealId} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                <span className="text-sm">
                  {meal.name}
                  {meal.name_hindi && (
                    <span className="text-[var(--muted)]"> ({meal.name_hindi})</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
