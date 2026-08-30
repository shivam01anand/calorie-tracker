import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'fuel_access'
const PUBLIC_PREFIXES = ['/access', '/api/auth', '/api/telegram', '/api/cron']

async function fingerprint(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function proxy(request: NextRequest) {
  const accessKey = process.env.APP_ACCESS_KEY
  if (!accessKey || PUBLIC_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  const expected = await fingerprint(accessKey)
  if (request.cookies.get(COOKIE)?.value === expected) return NextResponse.next()

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessUrl = new URL('/access', request.url)
  accessUrl.searchParams.set('next', request.nextUrl.pathname)
  return NextResponse.redirect(accessUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
