'use client'

import { FormEvent, useEffect, useState } from 'react'
import type { DayCoaching } from '@/lib/gemini'
import type { FoodLog } from '@/lib/supabase'

function coachingFrom(log: FoodLog): DayCoaching | null {
  if (!log.insights) return null
  try {
    return (JSON.parse(log.insights) as { coaching?: DayCoaching }).coaching || null
  } catch {
    return null
  }
}

export default function LogPage() {
  const [input, setInput] = useState('')
  const [logs, setLogs] = useState<FoodLog[]>([])
  const [latest, setLatest] = useState<FoodLog | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function refresh() {
    const response = await fetch('/api/log')
    if (response.ok) setLogs(await response.json())
  }

  useEffect(() => {
    let active = true
    fetch('/api/log')
      .then((response) => response.ok ? response.json() : [])
      .then((data) => { if (active) setLogs(data) })
    return () => { active = false }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!input.trim() || loading) return
    setLoading(true)
    setError('')
    const response = await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_input: input }),
    })
    const result = await response.json()
    if (!response.ok) {
      setError(result.error || 'The coach tripped. Try that once more.')
      setLoading(false)
      return
    }
    setLatest(result)
    setInput('')
    await refresh()
    setLoading(false)
  }

  async function remove(id: string) {
    if (!window.confirm('Remove this note from today?')) return
    const response = await fetch(`/api/log?id=${id}`, { method: 'DELETE' })
    if (response.ok) {
      if (latest?.id === id) setLatest(null)
      await refresh()
    }
  }

  const latestCoach = latest ? coachingFrom(latest) : null

  return (
    <div className="log-shell">
      <header className="page-intro">
        <p className="kicker">The thirty-second ritual</p>
        <h1>What fed you?</h1>
        <p>Messy beats missing. Write the day as you remember it; portions are welcome, never required.</p>
      </header>

      <form className="log-form" onSubmit={submit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Breakfast was eggs and toast… lunch rajma rice… protein shake after gym…"
          disabled={loading}
          aria-label="What you ate today"
        />
        <div className="log-form-footer">
          <span>Voice notes will live in Telegram.</span>
          <button disabled={loading || !input.trim()}>{loading ? 'Listening closely…' : 'Let the coach notice'}</button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>

      {latestCoach && (
        <section className="coach-letter">
          <p className="kicker">Your coach wrote back</p>
          <h2>{latestCoach.chapter_title}</h2>
          <p className="coach-opening">{latestCoach.opening}</p>
          <div className="coach-grid">
            <div>
              <span>What landed</span>
              <ul>{latestCoach.wins.map((win) => <li key={win}>{win}</li>)}</ul>
            </div>
            <div>
              <span>The loving truth</span>
              <p>{latestCoach.gentle_truth}</p>
            </div>
            <div className="tiny-move">
              <span>Tomorrow’s tiny move</span>
              <p>{latestCoach.next_move}</p>
            </div>
          </div>
          {latestCoach.follow_up_question && <p className="coach-question">{latestCoach.follow_up_question}</p>}
        </section>
      )}

      <section className="today-notes">
        <div className="section-heading">
          <div>
            <p className="kicker">Today’s notes</p>
            <h2>{logs.length ? `${logs.length} honest ${logs.length === 1 ? 'entry' : 'entries'}` : 'An open page'}</h2>
          </div>
        </div>
        {logs.length ? (
          <div className="entry-list">
            {logs.map((log) => {
              const coach = coachingFrom(log)
              return (
                <article className="food-entry" key={log.id}>
                  <div>
                    {coach && <span className="entry-chapter">{coach.chapter_title}</span>}
                    <p>{log.raw_input}</p>
                  </div>
                  <div className="entry-macros">
                    <span>{log.total_protein}g protein</span>
                    <span>{log.total_calories} kcal</span>
                    <button onClick={() => remove(log.id)} aria-label="Remove this entry">Remove</button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="empty-note"><p>Nothing logged yet.</p><span>The first rough sentence does all the heavy lifting.</span></div>
        )}
      </section>
    </div>
  )
}
