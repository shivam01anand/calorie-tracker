'use client'

interface MacroCardProps {
  calories: number
  protein: number
  carbs: number
  fat: number
  size?: 'sm' | 'md' | 'lg'
}

export function MacroCard({ calories, protein, carbs, fat, size = 'md' }: MacroCardProps) {
  const sizeClasses = {
    sm: 'p-3 gap-3',
    md: 'p-4 gap-4',
    lg: 'p-6 gap-6',
  }

  const numberClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  const labelClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  return (
    <div className={`bg-[var(--surface)] rounded-xl border border-[var(--border)] ${sizeClasses[size]}`}>
      <div className="grid grid-cols-4 gap-4 text-center">
        <div>
          <div className={`macro-value font-bold text-[var(--accent)] ${numberClasses[size]}`}>
            {calories}
          </div>
          <div className={`text-[var(--muted)] ${labelClasses[size]}`}>kcal</div>
        </div>
        <div>
          <div className={`macro-value font-bold text-[var(--foreground)] ${numberClasses[size]}`}>
            {protein}g
          </div>
          <div className={`text-[var(--muted)] ${labelClasses[size]}`}>protein</div>
        </div>
        <div>
          <div className={`macro-value font-bold text-[var(--foreground)] ${numberClasses[size]}`}>
            {carbs}g
          </div>
          <div className={`text-[var(--muted)] ${labelClasses[size]}`}>carbs</div>
        </div>
        <div>
          <div className={`macro-value font-bold text-[var(--foreground)] ${numberClasses[size]}`}>
            {fat}g
          </div>
          <div className={`text-[var(--muted)] ${labelClasses[size]}`}>fat</div>
        </div>
      </div>
    </div>
  )
}
