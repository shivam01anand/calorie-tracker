'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { WeeklyAnalysis } from '@/lib/supabase'
import { getWeekStart } from '@/lib/utils'

export default function InsightsPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [analysis, setAnalysis] = useState<WeeklyAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchAnalysis()
  }, [weekStart])

  const fetchAnalysis = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/insights?week_start=${weekStart}`)
      if (response.ok) {
        const data = await response.json()
        setAnalysis(data)
      }
    } catch (error) {
      console.error('Failed to fetch analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateAnalysis = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart }),
      })

      if (response.ok) {
        const data = await response.json()
        setAnalysis(data)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to generate analysis')
      }
    } catch (error) {
      console.error('Generate error:', error)
      alert('Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = new Date(weekStart)
    current.setDate(current.getDate() + (direction === 'next' ? 7 : -7))
    setWeekStart(getWeekStart(current))
  }

  // Format analysis text with markdown-style bold
  const formatAnalysis = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <span key={index} className="font-semibold text-[var(--accent)]">
            {part.slice(2, -2)}
          </span>
        )
      }
      return part
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Weekly Insights</h1>
        <p className="text-[var(--muted)] mt-1">AI-powered analysis of your nutrition</p>
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

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button onClick={generateAnalysis} loading={generating} size="lg">
          {analysis ? 'Regenerate Analysis' : 'Generate Analysis'}
        </Button>
      </div>

      {/* Analysis Content */}
      {loading ? (
        <div className="text-center py-12 text-[var(--muted)]">Loading...</div>
      ) : analysis ? (
        <div className="space-y-6">
          {/* Main Analysis */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🧠</span>
              <h2 className="font-bold text-[var(--foreground)]">Analysis</h2>
            </div>
            <div className="text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
              {formatAnalysis(analysis.analysis)}
            </div>
          </div>

          {/* Missing Nutrients */}
          {analysis.missing_nutrients && analysis.missing_nutrients.length > 0 && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">⚠️</span>
                <h2 className="font-bold text-[var(--foreground)]">Missing This Week</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.missing_nutrients.map((nutrient, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-[var(--warning)]/20 text-[var(--warning)] rounded-full text-sm"
                  >
                    {nutrient}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">💡</span>
                <h2 className="font-bold text-[var(--foreground)]">Add These Next Week</h2>
              </div>
              <ul className="space-y-3">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0" />
                    <span className="text-[var(--foreground)]">{formatAnalysis(rec)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Generated At */}
          <p className="text-center text-xs text-[var(--muted)]">
            Generated on{' '}
            {new Date(analysis.created_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center">
          <p className="text-[var(--muted)] mb-2">No analysis generated for this week yet.</p>
          <p className="text-sm text-[var(--muted)]">
            Log some food entries first, then click &quot;Generate Analysis&quot; to get insights.
          </p>
        </div>
      )}
    </div>
  )
}
