'use client'

import { useState, useEffect } from 'react'

// Targets based on: 69kg, muscle gain, ~2500 cal
const TARGETS = {
  calories: 2500,
  protein: 117,  // 1.7g × 69kg
  carbs: 340,
  fat: 62,
}

interface Meal {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface TargetProgressProps {
  calories: number
  protein: number
  carbs: number
  fat: number
  meals?: Meal[]
}

export function TargetProgress({ calories, protein, carbs, fat, meals = [] }: TargetProgressProps) {
  const [smartTip, setSmartTip] = useState<string | null>(null)
  const [loadingTip, setLoadingTip] = useState(false)

  // Fetch smart analysis when meals change
  useEffect(() => {
    if (meals.length > 0) {
      fetchSmartTip()
    }
  }, [meals.length, calories, protein, carbs, fat])

  const fetchSmartTip = async () => {
    setLoadingTip(true)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meals,
          totals: { calories, protein, carbs, fat }
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setSmartTip(data.analysis)
      }
    } catch (error) {
      console.error('Failed to fetch analysis:', error)
    } finally {
      setLoadingTip(false)
    }
  }

  const getStatus = (current: number, target: number, type: 'cal' | 'protein' | 'carbs' | 'fat') => {
    const percent = (current / target) * 100

    if (type === 'cal') {
      if (percent < 70) return { label: 'Under-eating', color: 'var(--warning)', emoji: '⚠️' }
      if (percent < 90) return { label: 'Low', color: 'var(--warning)', emoji: '📉' }
      if (percent <= 110) return { label: 'On track', color: 'var(--success)', emoji: '✓' }
      if (percent <= 130) return { label: 'Surplus', color: 'var(--accent)', emoji: '💪' }
      return { label: 'High', color: 'var(--error)', emoji: '🔥' }
    }

    if (type === 'protein') {
      if (percent < 70) return { label: 'Too low', color: 'var(--error)', emoji: '🚨' }
      if (percent < 90) return { label: 'Need more', color: 'var(--warning)', emoji: '📉' }
      if (percent <= 120) return { label: 'Good', color: 'var(--success)', emoji: '💪' }
      return { label: 'High', color: 'var(--accent)', emoji: '🦍' }
    }

    if (type === 'carbs') {
      if (percent < 60) return { label: 'Low energy', color: 'var(--warning)', emoji: '⚡' }
      if (percent < 85) return { label: 'Moderate', color: 'var(--muted)', emoji: '📊' }
      if (percent <= 115) return { label: 'Good', color: 'var(--success)', emoji: '✓' }
      return { label: 'High', color: 'var(--warning)', emoji: '📈' }
    }

    // fat
    if (percent < 60) return { label: 'Too low', color: 'var(--warning)', emoji: '⚠️' }
    if (percent < 90) return { label: 'Moderate', color: 'var(--muted)', emoji: '📊' }
    if (percent <= 120) return { label: 'Good', color: 'var(--success)', emoji: '✓' }
    return { label: 'High', color: 'var(--warning)', emoji: '📈' }
  }

  const calStatus = getStatus(calories, TARGETS.calories, 'cal')
  const proStatus = getStatus(protein, TARGETS.protein, 'protein')
  const carbStatus = getStatus(carbs, TARGETS.carbs, 'carbs')
  const fatStatus = getStatus(fat, TARGETS.fat, 'fat')

  // Find which macro is most off-target
  const fatPercent = (fat / TARGETS.fat) * 100
  const proPercent = (protein / TARGETS.protein) * 100

  // Sort meals by the problematic macro
  const sortedByFat = [...meals].sort((a, b) => b.fat - a.fat)
  const sortedByProtein = [...meals].sort((a, b) => b.protein - a.protein)

  const showFatBreakdown = fatPercent > 120
  const showProteinBreakdown = proPercent < 85

  const MacroBar = ({
    label,
    current,
    target,
    unit,
    status
  }: {
    label: string
    current: number
    target: number
    unit: string
    status: { label: string; color: string; emoji: string }
  }) => {
    const percent = Math.min((current / target) * 100, 150)

    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-[var(--muted)]">{label}</span>
          <span className="text-sm">
            <span className="macro-value font-medium" style={{ color: status.color }}>
              {current}{unit}
            </span>
            <span className="text-[var(--muted)]"> / {target}{unit}</span>
            <span className="ml-1 text-xs">{status.emoji}</span>
          </span>
        </div>
        <div className="h-1.5 bg-[var(--background)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(percent, 100)}%`,
              backgroundColor: status.color,
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--foreground)]">Target Check</h3>
        <span className="text-xs text-[var(--muted)]">69kg • Muscle Gain</span>
      </div>

      <div className="space-y-3">
        <MacroBar label="Calories" current={calories} target={TARGETS.calories} unit="" status={calStatus} />
        <MacroBar label="Protein" current={protein} target={TARGETS.protein} unit="g" status={proStatus} />
        <MacroBar label="Carbs" current={carbs} target={TARGETS.carbs} unit="g" status={carbStatus} />
        <MacroBar label="Fat" current={fat} target={TARGETS.fat} unit="g" status={fatStatus} />
      </div>

      {/* Smart AI Tip */}
      {(loadingTip || smartTip) && (
        <div className="p-3 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20">
          <div className="flex items-start gap-2">
            <span className="text-sm">💡</span>
            <p className="text-sm text-[var(--foreground)]">
              {loadingTip ? 'Analyzing...' : smartTip}
            </p>
          </div>
        </div>
      )}

      {/* Per-food breakdown for problematic macros */}
      {meals.length > 1 && (showFatBreakdown || showProteinBreakdown) && (
        <div className="pt-2 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--muted)] mb-2">
            {showFatBreakdown ? 'Fat contributors:' : 'Protein sources:'}
          </p>
          <div className="space-y-1">
            {(showFatBreakdown ? sortedByFat : sortedByProtein).slice(0, 3).map((meal, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-[var(--foreground)] truncate mr-2">{meal.name}</span>
                <span className="text-[var(--muted)] macro-value whitespace-nowrap">
                  {showFatBreakdown
                    ? `${meal.fat}g fat`
                    : `${meal.protein}g protein`
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-[var(--muted)] text-center">
        Protein: 1.7g × 69kg = {TARGETS.protein}g
      </div>
    </div>
  )
}
