'use client'

// Targets based on: 69kg, muscle gain, ~2500 cal
// Protein: 1.7g/kg = 117g
// Fat: ~0.9g/kg = 62g
// Carbs: remaining cals = ~340g
const TARGETS = {
  calories: 2500,
  protein: 117,  // 1.7g × 69kg
  carbs: 340,
  fat: 62,
}

interface TargetProgressProps {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export function TargetProgress({ calories, protein, carbs, fat }: TargetProgressProps) {
  const getStatus = (current: number, target: number, type: 'cal' | 'protein' | 'carbs' | 'fat') => {
    const percent = (current / target) * 100

    if (type === 'cal') {
      if (percent < 70) return { label: 'Under-eating', color: 'var(--warning)', emoji: '⚠️' }
      if (percent < 90) return { label: 'Low', color: 'var(--warning)', emoji: '📉' }
      if (percent <= 110) return { label: 'On track', color: 'var(--success)', emoji: '✓' }
      if (percent <= 130) return { label: 'Surplus', color: 'var(--accent)', emoji: '💪' }
      return { label: 'High', color: 'var(--error)', emoji: '🔥' }
    }

    if (type === 'protein') {
      if (percent < 70) return { label: 'Too low', color: 'var(--error)', emoji: '🚨' }
      if (percent < 90) return { label: 'Need more', color: 'var(--warning)', emoji: '📉' }
      if (percent <= 120) return { label: 'Good', color: 'var(--success)', emoji: '💪' }
      return { label: 'High', color: 'var(--accent)', emoji: '🦍' }
    }

    if (type === 'carbs') {
      if (percent < 60) return { label: 'Low energy', color: 'var(--warning)', emoji: '⚡' }
      if (percent < 85) return { label: 'Moderate', color: 'var(--muted)', emoji: '📊' }
      if (percent <= 115) return { label: 'Good', color: 'var(--success)', emoji: '✓' }
      return { label: 'High', color: 'var(--warning)', emoji: '📈' }
    }

    // fat
    if (percent < 60) return { label: 'Too low', color: 'var(--warning)', emoji: '⚠️' }
    if (percent < 90) return { label: 'Moderate', color: 'var(--muted)', emoji: '📊' }
    if (percent <= 120) return { label: 'Good', color: 'var(--success)', emoji: '✓' }
    return { label: 'High', color: 'var(--warning)', emoji: '📈' }
  }

  const calStatus = getStatus(calories, TARGETS.calories, 'cal')
  const proStatus = getStatus(protein, TARGETS.protein, 'protein')
  const carbStatus = getStatus(carbs, TARGETS.carbs, 'carbs')
  const fatStatus = getStatus(fat, TARGETS.fat, 'fat')

  // Overall verdict
  const getVerdict = () => {
    const calPct = (calories / TARGETS.calories) * 100
    const proPct = (protein / TARGETS.protein) * 100
    const carbPct = (carbs / TARGETS.carbs) * 100
    const fatPct = (fat / TARGETS.fat) * 100

    if (proPct < 70) {
      return { message: "Protein way too low. You're leaving gains on the table.", type: 'bad' }
    }
    if (proPct < 85 && calPct >= 80) {
      return { message: "Eating enough but protein is low. Add chicken, eggs, or paneer.", type: 'warning' }
    }
    if (calPct < 75) {
      return { message: "Under-eating. Your body needs fuel to build muscle.", type: 'bad' }
    }
    if (fatPct > 140 && calPct > 100) {
      return { message: "Fat is high. Not bad, but watch the oily stuff.", type: 'warning' }
    }
    if (calPct >= 90 && calPct <= 115 && proPct >= 90 && proPct <= 130) {
      return { message: "Solid day. You're feeding the machine right.", type: 'good' }
    }
    if (calPct > 130) {
      return { message: "Heavy surplus. Good for bulking, watch fat gain.", type: 'warning' }
    }
    if (carbPct < 60 && proPct >= 90) {
      return { message: "Low carb day. Fine occasionally, but carbs fuel workouts.", type: 'ok' }
    }
    return { message: "Decent day. Keep pushing.", type: 'ok' }
  }

  const verdict = getVerdict()

  const MacroBar = ({
    label,
    current,
    target,
    unit,
    status
  }: {
    label: string
    current: number
    target: number
    unit: string
    status: { label: string; color: string; emoji: string }
  }) => {
    const percent = Math.min((current / target) * 100, 150)

    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-[var(--muted)]">{label}</span>
          <span className="text-sm">
            <span className="macro-value font-medium" style={{ color: status.color }}>
              {current}{unit}
            </span>
            <span className="text-[var(--muted)]"> / {target}{unit}</span>
            <span className="ml-1 text-xs">{status.emoji}</span>
          </span>
        </div>
        <div className="h-1.5 bg-[var(--background)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(percent, 100)}%`,
              backgroundColor: status.color,
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--foreground)]">Target Check</h3>
        <span className="text-xs text-[var(--muted)]">69kg • Muscle Gain</span>
      </div>

      <div className="space-y-3">
        <MacroBar label="Calories" current={calories} target={TARGETS.calories} unit="" status={calStatus} />
        <MacroBar label="Protein" current={protein} target={TARGETS.protein} unit="g" status={proStatus} />
        <MacroBar label="Carbs" current={carbs} target={TARGETS.carbs} unit="g" status={carbStatus} />
        <MacroBar label="Fat" current={fat} target={TARGETS.fat} unit="g" status={fatStatus} />
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

      <div className="text-xs text-[var(--muted)] text-center">
        Protein target: 1.7g × 69kg = {TARGETS.protein}g
      </div>
    </div>
  )
}
