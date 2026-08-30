export const COACH_PROFILE = {
  name: 'Shivam',
  age: 29.5,
  sex: 'male',
  heightCm: 175,
  weightKg: 67,
  background: 'South Asian',
  activity: 'Strength trains most days when life allows',
  goal: 'Body recomposition: gradually reduce body-fat percentage while building visible muscle',
  style: 'validating, loving, encouraging, motivating, playful, ADHD-friendly, never patronising',
  timeZone: 'Asia/Kolkata',
  reminderHourLocal: 23,
  targets: {
    proteinFloorG: 120,
    proteinStretchG: 145,
    calorieFloor: 2200,
    calorieCeiling: 2450,
    fiberFloorG: 30,
  },
} as const

export const PROFILE_CONTEXT = `
Name: ${COACH_PROFILE.name}
Age: ${COACH_PROFILE.age}; sex: ${COACH_PROFILE.sex}; height: ${COACH_PROFILE.heightCm} cm; weight: about ${COACH_PROFILE.weightKg} kg
Context: ${COACH_PROFILE.background}; ${COACH_PROFILE.activity}
Goal: ${COACH_PROFILE.goal}
Working targets, deliberately treated as ranges rather than medical prescriptions:
- Protein floor: ${COACH_PROFILE.targets.proteinFloorG}g; stretch zone: up to ${COACH_PROFILE.targets.proteinStretchG}g
- Energy guide: roughly ${COACH_PROFILE.targets.calorieFloor}–${COACH_PROFILE.targets.calorieCeiling} kcal on an ordinary training day
- Fibre direction: around ${COACH_PROFILE.targets.fiberFloorG}g
Coach personality: ${COACH_PROFILE.style}
`.trim()

export function formatIndiaDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: COACH_PROFILE.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatIndiaDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: COACH_PROFILE.timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

export function getIndiaHour(date = new Date()) {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: COACH_PROFILE.timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).find((part) => part.type === 'hour')?.value
  return Number(hour || 0)
}
