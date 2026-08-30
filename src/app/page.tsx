'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { FoodLog } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

const PROTEIN_FLOOR = 120
const CALORIE_FLOOR = 2050
const CALORIE_CEILING = 2400

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

export default function DashboardPage() {
  const [logs, setLogs] = useState<FoodLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const dates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - index)
      return formatDate(date)
    })

    Promise.all(
      dates.map((date) => fetch(`/api/log?date=${date}`).then((response) => response.ok ? response.json() : []))
    )
      .then((days) => setLogs(days.flat()))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [])

  const today = formatDate(new Date())
  const todaysLogs = logs.filter((log) => log.date === today)
  const totals = todaysLogs.reduce(
    (sum, log) => ({
      calories: sum.calories + log.total_calories,
      protein: sum.protein + log.total_protein,
      carbs: sum.carbs + log.total_carbs,
      fat: sum.fat + log.total_fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const loggedDays = new Set(logs.map((log) => log.date)).size
  const proteinProgress = clamp((totals.protein / PROTEIN_FLOOR) * 100)
  const daySignal = useMemo(() => {
    if (!todaysLogs.length) return { eyebrow: 'An open page', title: 'Nothing to prove. Just notice.', note: 'Tell me what fed you today—rough, rambling, honest is perfect.' }
    if (totals.protein >= PROTEIN_FLOOR && totals.calories <= CALORIE_CEILING) {
      return { eyebrow: 'Quiet builder', title: 'Muscle had a very good day.', note: 'Enough structure to move forward, without turning dinner into homework.' }
    }
    if (totals.protein >= PROTEIN_FLOOR) {
      return { eyebrow: 'Protein plot armour', title: 'The foundation showed up.', note: 'Your muscle target is protected. Tomorrow, let plants and rhythm join the story.' }
    }
    return { eyebrow: 'Still becoming', title: 'A useful day, not a verdict.', note: `You are about ${Math.max(0, PROTEIN_FLOOR - totals.protein)}g from the protein floor. One simple anchor can close it.` }
  }, [todaysLogs.length, totals.calories, totals.protein])

  const signals = [
    { label: 'You noticed', active: todaysLogs.length > 0 },
    { label: 'Protein anchored', active: totals.protein >= PROTEIN_FLOOR },
    { label: 'Energy in range', active: totals.calories >= CALORIE_FLOOR && totals.calories <= CALORIE_CEILING },
    { label: 'Week has rhythm', active: loggedDays >= 4 },
  ]

  return (
    <div className="dashboard-shell">
      <section className="day-opening">
        <p className="kicker">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <div className="opening-grid">
          <div>
            <p className="signal-name">{daySignal.eyebrow}</p>
            <h1>{daySignal.title}</h1>
            <p className="opening-note">{daySignal.note}</p>
          </div>
          <Link className="log-invitation" href="/log">
            <span>Tonight’s ritual</span>
            <strong>{todaysLogs.length ? 'Add what came later' : 'Tell me what you ate'}</strong>
            <small>Text now · voice on Telegram soon</small>
          </Link>
        </div>
      </section>

      <section className="signal-panel" aria-label="Today’s signals">
        <div className="section-heading">
          <div>
            <p className="kicker">Today’s constellation</p>
            <h2>Signals, never grades.</h2>
          </div>
          <span className="quiet-status">{loading ? 'Gathering…' : `${signals.filter((signal) => signal.active).length} lights on`}</span>
        </div>
        <div className="signal-row">
          {signals.map((signal) => (
            <div className={`signal-item ${signal.active ? 'is-active' : ''}`} key={signal.label}>
              <span className="signal-dot" aria-hidden="true" />
              <span>{signal.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="numbers-grid">
        <article className="protein-card">
          <div className="section-heading compact">
            <div>
              <p className="kicker">Protein compass</p>
              <h2>{totals.protein || '—'}<small>{totals.protein ? 'g' : ''}</small></h2>
            </div>
            <span className="quiet-status">floor {PROTEIN_FLOOR}g</span>
          </div>
          <div className="progress-track" aria-label={`${Math.round(proteinProgress)}% of protein floor`}>
            <span style={{ width: `${proteinProgress}%` }} />
          </div>
          <p>{totals.protein >= PROTEIN_FLOOR ? 'The building material arrived.' : 'Think one anchor—not twelve optimisations.'}</p>
        </article>

        <article className="rhythm-card">
          <p className="kicker">Seven-day rhythm</p>
          <div className="rhythm-number"><strong>{loggedDays}</strong><span>of 7 days noticed</span></div>
          <p>Returning counts more than perfection.</p>
        </article>
      </section>

      <section className="recent-section">
        <div className="section-heading">
          <div>
            <p className="kicker">Today, in your words</p>
            <h2>{todaysLogs.length ? 'The honest record' : 'A blank space, not a broken streak'}</h2>
          </div>
          {todaysLogs.length > 0 && <Link href="/log">Edit the day</Link>}
        </div>

        {todaysLogs.length > 0 ? (
          <div className="entry-list">
            {todaysLogs.map((log) => (
              <article key={log.id} className="food-entry">
                <p>{log.raw_input}</p>
                <div>
                  <span>{log.total_protein}g protein</span>
                  <span>{log.total_calories} kcal <em>estimated</em></span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-note">
            <p>“Had chai, something with paneer, rice… honestly forgot the rest.”</p>
            <span>That is enough to begin. The coach can ask one useful follow-up.</span>
          </div>
        )}
      </section>

      <footer className="health-note">
        Built for body recomposition: add muscle, reveal it slowly. Nutrition numbers are estimates—not medical advice.
      </footer>
    </div>
  )
}
