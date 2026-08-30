import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://calorie-tracker-mocha-two.vercel.app'),
  title: 'Fuel — food, noticed',
  description: 'A gentle nutrition coach for building muscle and living leaner.',
  openGraph: {
    title: 'Fuel — food, noticed',
    description: 'A gentle coach for muscle, rhythm, and real life.',
    images: [{ url: '/og.png', width: 1792, height: 936, alt: 'Fuel — food, noticed' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fuel — food, noticed',
    description: 'A gentle coach for muscle, rhythm, and real life.',
    images: ['/og.png'],
  },
}

const navItems = [
  { href: '/', label: 'Today' },
  { href: '/log', label: 'Log' },
  { href: '/insights', label: 'Week' },
]

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <nav className="site-nav">
          <div className="nav-inner">
            <Link href="/" className="wordmark" aria-label="Fuel home">
              <span>FUEL</span>
              <small>food, noticed</small>
            </Link>
            <div className="nav-links">
              {navItems.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}
