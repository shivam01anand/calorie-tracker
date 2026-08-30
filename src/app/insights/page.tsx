'use client'

import { useEffect, useState } from 'react'
import type { WeeklyCoachReport } from '@/lib/gemini'
import type { WeeklyAnalysis } from '@/lib/supabase'
import { getWeekStart } from '@/lib/utils'

function parseReport(analysis: WeeklyAnalysis | null): WeeklyCoachReport | null {
  if (!analysis?.analysis) return null
  try {
    return JSON.parse(analysis.analysis) as WeeklyCoachReport
  } catch {
    return {
      title: 'The week in progress',
      opening: analysis.analysis,
      wins: [],
      pattern: '',
      experiment: analysis.recommendations?.[0] || '',
      closing: 'The next honest log is always enough.',
      missing_nutrients: analysis.missing_nutrients || [],
      recommendations: analysis.recommendations || [],
    }
  }
}

export default function InsightsPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [analysis, setAnalysis] = useState<WeeklyAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const report = parseReport(analysis)

  useEffect(() => {
    let active = true
    fetch(`/api/insights?week_start=${weekStart}`)
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (active) setAnalysis(data) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [weekStart])

  async function generate() {
    setGenerating(true)
    const response = await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_start: weekStart }),
    })
    if (response.ok) setAnalysis(await response.json())
    setGenerating(false)
  }

  function moveWeek(days: number) {
    const date = new Date(`${weekStart}T12:00:00`)
    date.setDate(date.getDate() + days)
    setLoading(true)
    setWeekStart(getWeekStart(date))
  }

  return (
    <div className="week-shell">
      <header className="week-header">
        <div>
          <p className="kicker">Your weekly chapter</p>
          <h1>{report?.title || 'The story is gathering.'}</h1>
          <p>{report?.opening || 'Not a report card. A compassionate look at what your real life made possible.'}</p>
        </div>
        <div className="week-controls">
          <button onClick={() => moveWeek(-7)}>←</button>
          <span>Week of {new Date(`${weekStart}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          <button onClick={() => moveWeek(7)}>→</button>
        </div>
      </header>

      {loading ? (
        <div className="week-empty">Gathering the week…</div>
      ) : report ? (
        <div className="week-story">
          <section className="receipts">
            <p className="kicker">The receipts</p>
            <h2>What quietly worked</h2>
            <ol>{report.wins.map((win, index) => <li key={win}><span>0{index + 1}</span>{win}</li>)}</ol>
          </section>
          <section className="pattern-note">
            <p className="kicker">The pattern worth noticing</p>
            <blockquote>{report.pattern}</blockquote>
          </section>
          <section className="experiment-note">
            <p className="kicker">One seven-day experiment</p>
            <h2>{report.experiment}</h2>
            {report.recommendations.length > 0 && <p>{report.recommendations.join(' · ')}</p>}
          </section>
          <p className="week-closing">{report.closing}</p>
        </div>
      ) : (
        <div className="week-empty">
          <p>There is no chapter yet.</p>
          <span>A few honest food notes are enough for the coach to see a pattern.</span>
          <button onClick={generate} disabled={generating}>{generating ? 'Reading the week…' : 'Write this week’s chapter'}</button>
        </div>
      )}

      {report && <button className="regenerate" onClick={generate} disabled={generating}>{generating ? 'Reading again…' : 'Refresh this chapter'}</button>}
    </div>
  )
}
