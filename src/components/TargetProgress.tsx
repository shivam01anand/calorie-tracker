'use client'

interface TargetProgressProps {
  calories: number
  protein: number
  carbs: number
  fat: number
  targetCalories?: number
  targetProtein?: number
}

export function TargetProgress({
  calories,
  protein,
  carbs,
  fat,
  targetCalories = 2500,
  targetProtein = 140,
}: TargetProgressProps) {
  const caloriePercent = Math.min((calories / targetCalories) * 100, 150)
  const proteinPercent = Math.min((protein / targetProtein) * 100, 150)

  const getCalorieStatus = () => {
    const percent = (calories / targetCalories) * 100
    if (percent < 70) return { label: 'Under-eating', color: 'var(--warning)', emoji: '⚠️' }
    if (percent < 90) return { label: 'Slightly low', color: 'var(--warning)', emoji: '📉' }
    if (percent <= 110) return { label: 'On track', color: 'var(--success)', emoji: '✓' }
    if (percent <= 130) return { label: 'Surplus mode', color: 'var(--accent)', emoji: '💪' }
    return { label: 'Overdoing it', color: 'var(--error)', emoji: '🔥' }
  }

  const getProteinStatus = () => {
    const percent = (protein / targetProtein) * 100
    if (percent < 60) return { label: 'Way too low', color: 'var(--error)', emoji: '🚨' }
    if (percent < 80) return { label: 'Need more', color: 'var(--warning)', emoji: '📉' }
    if (percent <= 100) return { label: 'Almost there', color: 'var(--accent)', emoji: '👍' }
    if (percent <= 130) return { label: 'Crushing it', color: 'var(--success)', emoji: '💪' }
    return { label: 'Beast mode', color: 'var(--success)', emoji: '🦍' }
  }

  const calorieStatus = getCalorieStatus()
  const proteinStatus = getProteinStatus()

  // Overall verdict for muscle gain
  const getVerdict = () => {
    const calPct = (calories / targetCalories) * 100
    const proPct = (protein / targetProtein) * 100

    if (proPct < 70) {
      return {
        message: "Protein too low for muscle gain. You're leaving gains on the table.",
        type: 'bad'
      }
    }
    if (calPct < 80 && proPct >= 80) {
      return {
        message: "Good protein, but calories too low. Your body needs fuel to build.",
        type: 'warning'
      }
    }
    if (calPct >= 90 && calPct <= 120 && proPct >= 90) {
      return {
        message: "Solid day. You're feeding the machine right.",
        type: 'good'
      }
    }
    if (calPct > 130 && proPct >= 90) {
      return {
        message: "Heavy surplus. Good if you're bulking hard, watch the fat gain.",
        type: 'warning'
      }
    }
    if (calPct >= 80 && proPct >= 80) {
      return {
        message: "Decent day. Push protein a bit higher for optimal gains.",
        type: 'ok'
      }
    }
    return {
      message: "Not your best day. Tomorrow, prioritize protein.",
      type: 'bad'
    }
  }

  const verdict = getVerdict()

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--foreground)]">Target Check</h3>
        <span className="text-xs text-[var(--muted)]">Goal: Muscle Gain</span>
      </div>

      {/* Calories */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-[var(--muted)]">Calories</span>
          <span className="text-sm">
            <span className="macro-value font-medium" style={{ color: calorieStatus.color }}>
              {calories}
            </span>
            <span className="text-[var(--muted)]"> / {targetCalories}</span>
            <span className="ml-2">{calorieStatus.emoji}</span>
          </span>
        </div>
        <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(caloriePercent, 100)}%`,
              backgroundColor: calorieStatus.color,
            }}
          />
        </div>
        <div className="text-xs mt-1" style={{ color: calorieStatus.color }}>
          {calorieStatus.label}
        </div>
      </div>

      {/* Protein */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-[var(--muted)]">Protein</span>
          <span className="text-sm">
            <span className="macro-value font-medium" style={{ color: proteinStatus.color }}>
              {protein}g
            </span>
            <span className="text-[var(--muted)]"> / {targetProtein}g</span>
            <span className="ml-2">{proteinStatus.emoji}</span>
          </span>
        </div>
        <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(proteinPercent, 100)}%`,
              backgroundColor: proteinStatus.color,
            }}
          />
        </div>
        <div className="text-xs mt-1" style={{ color: proteinStatus.color }}>
          {proteinStatus.label}
        </div>
      </div>

      {/* Verdict */}
      <div
        className={`p-3 rounded-lg text-sm ${
          verdict.type === 'good'
            ? 'bg-[var(--success)]/10 text-[var(--success)]'
            : verdict.type === 'ok'
            ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
            : verdict.type === 'warning'
            ? 'bg-[var(--warning)]/10 text-[var(--warning)]'
            : 'bg-[var(--error)]/10 text-[var(--error)]'
        }`}
      >
        {verdict.message}
      </div>
    </div>
  )
}
