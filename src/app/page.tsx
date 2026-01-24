'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MacroCard } from '@/components/MacroCard'
import { Button } from '@/components/ui/Button'
import { FoodLog } from '@/lib/supabase'
import { formatDate, calculateStreak } from '@/lib/utils'

export default function DashboardPage() {
  const [todaysLogs, setTodaysLogs] = useState<FoodLog[]>([])
  const [weekLogs, setWeekLogs] = useState<FoodLog[]>([])
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch today's logs
      const todayRes = await fetch('/api/log')
      if (todayRes.ok) {
        const todayData = await todayRes.json()
        setTodaysLogs(todayData)
      }

      // Fetch last 7 days for streak calculation
      const dates: string[] = []
      for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        dates.push(formatDate(d))
      }

      // Fetch logs for streak calculation (simplified - fetch all recent)
      const weekPromises = dates.slice(0, 7).map((date) =>
        fetch(`/api/log?date=${date}`).then((r) => (r.ok ? r.json() : []))
      )
      const weekResults = await Promise.all(weekPromises)
      const allLogs = weekResults.flat()
      setWeekLogs(allLogs)

      // Calculate streak
      const uniqueDates = [...new Set(allLogs.map((l: FoodLog) => l.date))]
      setStreak(calculateStreak(uniqueDates.map((d) => ({ date: d }))))
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const todaysTotals = todaysLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.total_calories,
      protein: acc.protein + log.total_protein,
      carbs: acc.carbs + log.total_carbs,
      fat: acc.fat + log.total_fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const weekAvg = weekLogs.length > 0
    ? {
        calories: Math.round(weekLogs.reduce((s, l) => s + l.total_calories, 0) / 7),
        protein: Math.round(weekLogs.reduce((s, l) => s + l.total_protein, 0) / 7),
      }
    : { calories: 0, protein: 0 }

  const today = new Date()
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">{greeting}</h1>
        <p className="text-[var(--muted)] text-lg">
          {today.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Streak */}
      <div className="flex justify-center">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-8 py-6 text-center">
          <div className="text-5xl font-bold text-[var(--accent)] macro-value">{streak}</div>
          <div className="text-[var(--muted)] mt-1">day streak</div>
          {streak === 0 && (
            <div className="text-sm text-[var(--error)] mt-2">Start logging to build your streak!</div>
          )}
          {streak >= 7 && (
            <div className="text-sm text-[var(--success)] mt-2">You&apos;re on fire!</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/log" className="block">
          <div className="bg-[var(--accent)] text-[var(--background)] rounded-xl p-6 hover:opacity-90 transition-opacity h-full">
            <div className="text-2xl mb-2">📝</div>
            <div className="font-bold text-lg">Log Food</div>
            <div className="text-sm opacity-80">Record what you ate</div>
          </div>
        </Link>
        <Link href="/plan" className="block">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 hover:border-[var(--accent)] transition-colors h-full">
            <div className="text-2xl mb-2">📅</div>
            <div className="font-bold text-lg text-[var(--foreground)]">Plan Week</div>
            <div className="text-sm text-[var(--muted)]">Decide what to eat</div>
          </div>
        </Link>
      </div>

      {/* Today's Summary */}
      <div>
        <h2 className="text-sm font-medium text-[var(--muted)] mb-3 uppercase tracking-wide">
          Today&apos;s Total
        </h2>
        {loading ? (
          <div className="text-[var(--muted)]">Loading...</div>
        ) : todaysLogs.length > 0 ? (
          <MacroCard {...todaysTotals} size="lg" />
        ) : (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center">
            <p className="text-[var(--muted)] mb-4">No food logged today</p>
            <Link href="/log">
              <Button>Log Your First Meal</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Weekly Average */}
      {weekLogs.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-sm text-[var(--muted)] mb-1">7-Day Avg Calories</div>
            <div className="text-2xl font-bold text-[var(--foreground)] macro-value">
              {weekAvg.calories}
            </div>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-sm text-[var(--muted)] mb-1">7-Day Avg Protein</div>
            <div className="text-2xl font-bold text-[var(--foreground)] macro-value">
              {weekAvg.protein}g
            </div>
          </div>
        </div>
      )}

      {/* Recent Logs */}
      {todaysLogs.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[var(--muted)] mb-3 uppercase tracking-wide">
            Today&apos;s Entries
          </h2>
          <div className="space-y-2">
            {todaysLogs.slice(0, 3).map((log) => (
              <div
                key={log.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 flex justify-between items-center"
              >
                <span className="text-[var(--foreground)] truncate flex-1 mr-4">
                  {log.raw_input}
                </span>
                <span className="text-[var(--accent)] font-medium macro-value whitespace-nowrap">
                  {log.total_calories} kcal
                </span>
              </div>
            ))}
            {todaysLogs.length > 3 && (
              <Link
                href="/log"
                className="text-sm text-[var(--accent)] hover:underline block text-center py-2"
              >
                View all {todaysLogs.length} entries →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4 pt-4">
        <Link
          href="/library"
          className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors text-center"
        >
          <div className="text-[var(--foreground)] font-medium">Meal Library</div>
          <div className="text-xs text-[var(--muted)]">Browse meals</div>
        </Link>
        <Link
          href="/insights"
          className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors text-center"
        >
          <div className="text-[var(--foreground)] font-medium">Insights</div>
          <div className="text-xs text-[var(--muted)]">Weekly analysis</div>
        </Link>
      </div>
    </div>
  )
}
