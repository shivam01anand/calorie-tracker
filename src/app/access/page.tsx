'use client'

import { FormEvent, useState } from 'react'

export default function AccessPage() {
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState('')
  const [opening, setOpening] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setOpening(true)
    setError('')
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    })
    if (response.ok) {
      window.location.href = new URLSearchParams(window.location.search).get('next') || '/'
      return
    }
    const result = await response.json()
    setError(result.error || 'That did not work.')
    setOpening(false)
  }

  return (
    <div className="access-shell">
      <form className="access-card" onSubmit={submit}>
        <p className="kicker">A private table</p>
        <h1>Come in, Shivam.</h1>
        <p>Your food notes are personal. One quiet phrase keeps them that way.</p>
        <label htmlFor="passphrase">Passphrase</label>
        <input
          id="passphrase"
          type="password"
          autoComplete="current-password"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          autoFocus
        />
        {error && <span className="access-error">{error}</span>}
        <button disabled={opening || !passphrase}>{opening ? 'Opening…' : 'Open Fuel'}</button>
      </form>
    </div>
  )
}
