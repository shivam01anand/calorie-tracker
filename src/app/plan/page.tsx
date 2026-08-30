'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import type { Meal } from '@/lib/supabase'
import { getWeekStart, getWeekDays, getDayName } from '@/lib/utils'

interface DayPlan {
  breakfast?: string
  lunch?: string
  dinner?: string
  snacks?: string[]
}

interface WeekPlan {
  [day: string]: DayPlan
}

const mealTypes = ['breakfast', 'lunch', 'dinner'] as const

export default function PlanPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [plan, setPlan] = useState<WeekPlan>({})
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{
    day: string
    mealType: string
  } | null>(null)

  const weekDays = getWeekDays(weekStart)

  useEffect(() => {
    fetchPlan()
    fetchMeals()
  }, [weekStart])

  const fetchPlan = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/plan?week_start=${weekStart}`)
      if (response.ok) {
        const data = await response.json()
        setPlan(data.plan || {})
      }
    } catch (error) {
      console.error('Failed to fetch plan:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMeals = async () => {
    try {
      const response = await fetch('/api/meals')
      if (response.ok) {
        const data = await response.json()
        setMeals(data)
      }
    } catch (error) {
      console.error('Failed to fetch meals:', error)
    }
  }

  const savePlan = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart, plan }),
      })

      if (!response.ok) {
        alert('Failed to save plan')
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const selectMeal = (mealId: string) => {
    if (!selectedSlot) return

    const { day, mealType } = selectedSlot
    const dayKey = getDayName(day).toLowerCase()

    setPlan((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [mealType]: mealId,
      },
    }))

    setSelectedSlot(null)
  }

  const clearMeal = (day: string, mealType: string) => {
    const dayKey = getDayName(day).toLowerCase()
    setPlan((prev) => {
      const newDayPlan = { ...prev[dayKey] }
      delete newDayPlan[mealType as keyof DayPlan]
      return {
        ...prev,
        [dayKey]: newDayPlan,
      }
    })
  }

  const getMealById = (id: string) => meals.find((m) => m.id === id)

  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = new Date(weekStart)
    current.setDate(current.getDate() + (direction === 'next' ? 7 : -7))
    setWeekStart(getWeekStart(current))
  }

  const filteredMeals = selectedSlot
    ? meals.filter((m) => m.category === selectedSlot.mealType || selectedSlot.mealType === 'snacks')
    : []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meal Plan</h1>
          <p className="text-[var(--muted)] mt-1">Plan your week ahead</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/cook-card/${weekStart}`}>
            <Button variant="secondary">Cook Card</Button>
          </Link>
          <Button onClick={savePlan} loading={saving}>
            Save Plan
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
        <button
          onClick={() => navigateWeek('prev')}
          className="p-2 hover:bg-[var(--background)] rounded-lg text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← Previous
        </button>
        <div className="text-center">
          <div className="text-sm text-[var(--muted)]">Week of</div>
          <div className="font-semibold">
            {new Date(weekStart).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        </div>
        <button
          onClick={() => navigateWeek('next')}
          className="p-2 hover:bg-[var(--background)] rounded-lg text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Next →
        </button>
      </div>

      {/* Calendar */}
      {loading ? (
        <div className="text-center py-12 text-[var(--muted)]">Loading plan...</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header Row */}
            <div className="grid grid-cols-8 gap-2 mb-2">
              <div className="p-2" />
              {weekDays.map((day) => (
                <div key={day} className="p-2 text-center">
                  <div className="text-xs text-[var(--muted)]">
                    {getDayName(day).slice(0, 3)}
                  </div>
                  <div className="text-sm font-medium">
                    {new Date(day).getDate()}
                  </div>
                </div>
              ))}
            </div>

            {/* Meal Rows */}
            {mealTypes.map((mealType) => (
              <div key={mealType} className="grid grid-cols-8 gap-2 mb-2">
                <div className="p-2 flex items-center">
                  <span className="text-sm text-[var(--muted)] capitalize">
                    {mealType}
                  </span>
                </div>
                {weekDays.map((day) => {
                  const dayKey = getDayName(day).toLowerCase()
                  const mealId = plan[dayKey]?.[mealType as keyof DayPlan] as string | undefined
                  const meal = mealId ? getMealById(mealId) : null

                  return (
                    <div
                      key={`${day}-${mealType}`}
                      className="relative group"
                    >
                      {meal ? (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 h-20 flex flex-col justify-between">
                          <div className="text-xs font-medium text-[var(--foreground)] line-clamp-2">
                            {meal.name}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-[var(--muted)] macro-value">
                              {meal.avg_calories} kcal
                            </span>
                            <button
                              onClick={() => clearMeal(day, mealType)}
                              className="opacity-0 group-hover:opacity-100 text-[var(--error)] text-xs"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedSlot({ day, mealType })}
                          className="w-full h-20 border-2 border-dashed border-[var(--border)] rounded-lg hover:border-[var(--accent)] hover:bg-[var(--surface)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--accent)]"
                        >
                          +
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meal Selector Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl w-full max-w-lg max-h-[70vh] overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
              <div>
                <h3 className="font-semibold">Select Meal</h3>
                <p className="text-sm text-[var(--muted)]">
                  {getDayName(selectedSlot.day)} - {selectedSlot.mealType}
                </p>
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {filteredMeals.length === 0 ? (
                <p className="text-center text-[var(--muted)] py-4">
                  No meals found for {selectedSlot.mealType}.{' '}
                  <Link href="/library" className="text-[var(--accent)] hover:underline">
                    Add some meals
                  </Link>
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredMeals.map((meal) => (
                    <button
                      key={meal.id}
                      onClick={() => selectMeal(meal.id)}
                      className="w-full text-left bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 hover:border-[var(--accent)] transition-colors"
                    >
                      <div className="font-medium">{meal.name}</div>
                      <div className="text-xs text-[var(--muted)] mt-1 macro-value">
                        {meal.avg_calories} kcal · {meal.avg_protein}g P · {meal.avg_carbs}g C · {meal.avg_fat}g F
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
