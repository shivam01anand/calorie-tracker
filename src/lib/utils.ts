export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
  d.setDate(diff)
  return formatDate(d)
}

export function getWeekDays(weekStart: string): string[] {
  const days: string[] = []
  const start = new Date(weekStart)
  for (let i = 0; i < 7; i++) {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    days.push(formatDate(day))
  }
  return days
}

export function getDayName(date: string): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[new Date(date).getDay()]
}

export function getDayNameHindi(date: string): string {
  const days = ['Ravivaar', 'Somvaar', 'Mangalvaar', 'Budhvaar', 'Guruvaar', 'Shukravaar', 'Shanivaar']
  return days[new Date(date).getDay()]
}

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function calculateStreak(logs: { date: string }[]): number {
  if (logs.length === 0) return 0

  const sortedDates = logs
    .map(l => l.date)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  const today = formatDate(new Date())
  const yesterday = formatDate(new Date(Date.now() - 86400000))

  // Check if the most recent log is today or yesterday
  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
    return 0
  }

  let streak = 1
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const current = new Date(sortedDates[i])
    const next = new Date(sortedDates[i + 1])
    const diffDays = (current.getTime() - next.getTime()) / 86400000

    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }

  return streak
}
