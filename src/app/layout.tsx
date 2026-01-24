import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fuel | Calorie Tracker",
  description: "Personal nutrition tracker for building the dream body",
};

const navItems = [
  { href: "/", label: "Home" },
  { href: "/log", label: "Log" },
  { href: "/plan", label: "Plan" },
  { href: "/library", label: "Library" },
  { href: "/insights", label: "Insights" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <Link
                href="/"
                className="text-xl font-bold tracking-tight text-[var(--accent)]"
              >
                FUEL
              </Link>
              <div className="flex items-center gap-1 sm:gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-3 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--surface)] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>
        <main className="pt-20 pb-8 px-4 sm:px-6 max-w-5xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
