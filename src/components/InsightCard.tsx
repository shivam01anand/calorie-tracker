'use client'

interface InsightCardProps {
  insights: string
}

export function InsightCard({ insights }: InsightCardProps) {
  // Parse markdown-style bold text
  const formatInsights = (text: string) => {
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
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🧬</span>
        <h3 className="font-semibold text-[var(--foreground)]">Nerdy Insights</h3>
      </div>
      <div className="text-[var(--foreground)] leading-relaxed whitespace-pre-wrap text-sm">
        {formatInsights(insights)}
      </div>
    </div>
  )
}
