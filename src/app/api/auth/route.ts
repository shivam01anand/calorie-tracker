import { createHash, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'fuel_access'

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export async function POST(request: NextRequest) {
  const configured = process.env.APP_ACCESS_KEY
  if (!configured) return NextResponse.json({ ok: true })

  const { passphrase } = await request.json() as { passphrase?: string }
  const supplied = Buffer.from(hash(passphrase || ''))
  const expected = Buffer.from(hash(configured))
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ error: 'That phrase did not open the door.' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE, hash(configured), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 90,
    path: '/',
  })
  return response
}
