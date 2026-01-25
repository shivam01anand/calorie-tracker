'use client'

import { useState, useEffect } from 'react'
import { MacroCard } from '@/components/MacroCard'
import { InsightCard } from '@/components/InsightCard'
import { TargetProgress } from '@/components/TargetProgress'
import { Button } from '@/components/ui/Button'
import { FoodLog } from '@/lib/supabase'

export default function LogPage() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [todaysLogs, setTodaysLogs] = useState<FoodLog[]>([])
  const [latestResult, setLatestResult] = useState<FoodLog | null>(null)

  useEffect(() => {
    fetchTodaysLogs()
  }, [])

  const fetchTodaysLogs = async () => {
    try {
      const response = await fetch('/api/log')
      if (response.ok) {
        const data = await response.json()
        setTodaysLogs(data)
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    setLoading(true)
    setLatestResult(null)

    try {
      const response = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_input: input }),
      })

      if (response.ok) {
        const data = await response.json()
        setLatestResult(data)
        setInput('')
        fetchTodaysLogs()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to log food')
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return

    try {
      const response = await fetch(`/api/log?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        fetchTodaysLogs()
        if (latestResult?.id === id) {
          setLatestResult(null)
        }
      } else {
        alert('Failed to delete')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Something went wrong')
    }
  }

  // Calculate today's totals
  const todaysTotals = todaysLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.total_calories,
      protein: acc.protein + log.total_protein,
      carbs: acc.carbs + log.total_carbs,
      fat: acc.fat + log.total_fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  // Aggregate all meals for smart analysis
  const allMeals = todaysLogs.flatMap(log => log.parsed_meals || [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Log Food</h1>
        <p className="text-[var(--muted)] mt-1">Just type what you ate. No overthinking.</p>
      </div>

      {/* Today's Total */}
      {todaysLogs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">
            Today&apos;s Total
          </h2>
          <MacroCard {...todaysTotals} size="lg" />
          <TargetProgress {...todaysTotals} meals={allMeals} />
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., 2 rotis with dal tadka, chicken curry, rice, and a glass of buttermilk"
            className="w-full h-32 px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
            disabled={loading}
          />
        </div>
        <Button type="submit" size="lg" loading={loading} className="w-full sm:w-auto">
          {loading ? 'Analyzing...' : 'Log Food'}
        </Button>
      </form>

      {/* Latest Result */}
      {latestResult && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <span className="text-[var(--success)] text-lg">✓</span>
            <span className="text-[var(--muted)]">Logged successfully</span>
          </div>
          <MacroCard
            calories={latestResult.total_calories}
            protein={latestResult.total_protein}
            carbs={latestResult.total_carbs}
            fat={latestResult.total_fat}
          />
          {latestResult.insights && <InsightCard insights={latestResult.insights} />}
        </div>
      )}

      {/* Today's Logs */}
      {todaysLogs.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[var(--muted)] mb-4 uppercase tracking-wide">
            Today&apos;s Entries
          </h2>
          <div className="space-y-3">
            {todaysLogs.map((log) => (
              <div
                key={log.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 group"
              >
                <div className="flex justify-between items-start gap-2 mb-3">
                  <p className="text-[var(--foreground)]">{log.raw_input}</p>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-[var(--error)] transition-opacity text-lg leading-none"
                    title="Delete entry"
                  >
                    ×
                  </button>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-[var(--accent)] font-medium macro-value">
                    {log.total_calories} kcal
                  </span>
                  <span className="text-[var(--muted)] macro-value">
                    {log.total_protein}g protein
                  </span>
                  <span className="text-[var(--muted)] macro-value">
                    {log.total_carbs}g carbs
                  </span>
                  <span className="text-[var(--muted)] macro-value">
                    {log.total_fat}g fat
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
