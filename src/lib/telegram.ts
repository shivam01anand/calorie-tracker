import { createHash } from 'node:crypto'
import type { CoachReply, DayAnalysis, DayCoaching } from './gemini'
import type { DailyFoodSummary } from './food-log'
import { COACH_PROFILE } from './profile'

const TELEGRAM_API = 'https://api.telegram.org'

function token() {
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not configured')
  return process.env.TELEGRAM_BOT_TOKEN
}

export interface TelegramVoice {
  file_id: string
  file_unique_id: string
  duration: number
  mime_type?: string
  file_size?: number
}

export interface TelegramMessage {
  message_id: number
  date: number
  chat: { id: number; type: string }
  from?: { id: number; first_name?: string; username?: string }
  text?: string
  voice?: TelegramVoice
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

async function telegramCall<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${TELEGRAM_API}/bot${token()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result = await response.json() as { ok: boolean; result: T; description?: string }
  if (!result.ok) throw new Error(result.description || `Telegram ${method} failed`)
  return result.result
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options: { replyToMessageId?: number } = {},
) {
  return telegramCall<TelegramMessage>('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(options.replyToMessageId ? {
      reply_parameters: {
        message_id: options.replyToMessageId,
        allow_sending_without_reply: true,
      },
    } : {}),
  })
}

export async function showTyping(chatId: string | number) {
  return telegramCall('sendChatAction', { chat_id: chatId, action: 'typing' })
}

export async function downloadTelegramVoice(voice: TelegramVoice): Promise<{ audio: Buffer; mimeType: string }> {
  if ((voice.file_size || 0) > 18 * 1024 * 1024) throw new Error('That voice note is a little too long. Keep it under 18 MB.')
  const file = await telegramCall<{ file_path?: string }>('getFile', { file_id: voice.file_id })
  if (!file.file_path) throw new Error('Telegram could not prepare that voice note')
  const response = await fetch(`${TELEGRAM_API}/file/bot${token()}/${file.file_path}`)
  if (!response.ok) throw new Error('Could not download the voice note')
  return {
    audio: Buffer.from(await response.arrayBuffer()),
    mimeType: voice.mime_type || 'audio/ogg',
  }
}

export function telegramLogId(chatId: number, messageId: number) {
  const hash = createHash('sha256').update(`fuel:${chatId}:${messageId}`).digest('hex').slice(0, 32)
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20)}`
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const constellationLabels: Record<DayCoaching['constellation']['protein'], string> = {
  glowing: '●',
  forming: '◐',
  quiet: '○',
}

export function formatDailyCoachMessage(coaching: DayCoaching, totals: { calories: number; protein: number }, transcript?: string) {
  const lights = Object.entries(coaching.constellation)
    .map(([name, state]) => `${constellationLabels[state]} ${name}`)
    .join('  ')

  const wins = coaching.wins.slice(0, 2).map((win) => `• ${escapeHtml(win)}`).join('\n')
  const transcriptLine = transcript ? `\n<i>I heard:</i> “${escapeHtml(transcript)}”\n` : ''
  const followUp = coaching.follow_up_question ? `\n<b>One thing I’m curious about</b>\n${escapeHtml(coaching.follow_up_question)}\n` : ''

  return `🌿 <b>${escapeHtml(coaching.chapter_title)}</b>
${escapeHtml(coaching.opening)}
${transcriptLine}
<b>What landed</b>
${wins}

<b>The loving truth</b>
${escapeHtml(coaching.gentle_truth)}

<b>Tomorrow’s tiny move</b>
${escapeHtml(coaching.next_move)}

${lights}
<i>Estimate: ${totals.protein}g protein · ${totals.calories} kcal. ${escapeHtml(coaching.confidence_note)}</i>${followUp}`.trim()
}

type Signal = 'green' | 'amber' | 'red'

const signalIcon: Record<Signal, string> = {
  green: '🟢',
  amber: '🟡',
  red: '🔴',
}

function metricSignal(
  metric: 'energy' | 'protein' | 'fiber',
  value: number,
  indiaHour: number,
): Signal {
  const targets = COACH_PROFILE.targets
  if (metric === 'protein') {
    if (value >= targets.proteinFloorG) return 'green'
    if (indiaHour >= 20 && value < targets.proteinFloorG * 0.6) return 'red'
    return 'amber'
  }
  if (metric === 'fiber') {
    if (value >= targets.fiberFloorG) return 'green'
    if (indiaHour >= 20 && value < targets.fiberFloorG * 0.6) return 'red'
    return 'amber'
  }
  if (value >= targets.calorieFloor && value <= targets.calorieCeiling) return 'green'
  if (value > targets.calorieCeiling * 1.15) return 'red'
  if (indiaHour >= 22 && value < targets.calorieFloor * 0.65) return 'red'
  return 'amber'
}

function progressBar(value: number, target: number) {
  const filled = Math.min(8, Math.max(0, Math.round((value / target) * 8)))
  return `<code>${'█'.repeat(filled)}${'░'.repeat(8 - filled)}</code>`
}

function dailyDashboard(summary: DailyFoodSummary, indiaHour: number) {
  const targets = COACH_PROFILE.targets
  const energy = signalIcon[metricSignal('energy', summary.calories, indiaHour)]
  const protein = signalIcon[metricSignal('protein', summary.protein, indiaHour)]
  const fiber = signalIcon[metricSignal('fiber', summary.fiber, indiaHour)]

  return `${energy} Energy  ${progressBar(summary.calories, targets.calorieFloor)}  <b>${summary.calories}</b> / ${targets.calorieFloor}–${targets.calorieCeiling} kcal
${protein} Protein ${progressBar(summary.protein, targets.proteinFloorG)}  <b>${summary.protein}g</b> / ${targets.proteinFloorG}g floor
${fiber} Fibre   ${progressBar(summary.fiber, targets.fiberFloorG)}  <b>${summary.fiber}g</b> / ~${targets.fiberFloorG}g
<i>Carbs ${summary.carbs}g · Fat ${summary.fat}g</i>`
}

function remainingToday(summary: DailyFoodSummary) {
  const targets = COACH_PROFILE.targets
  const proteinLeft = Math.max(0, targets.proteinFloorG - summary.protein)
  let energy: string
  if (summary.calories < targets.calorieFloor) {
    energy = `~${targets.calorieFloor - summary.calories}–${targets.calorieCeiling - summary.calories} kcal to the working range`
  } else if (summary.calories <= targets.calorieCeiling) {
    energy = 'energy is inside the working range'
  } else {
    energy = 'energy is above the guide—no compensation needed'
  }
  const protein = proteinLeft ? `~${proteinLeft}g protein to the floor` : 'protein floor reached'
  return `${protein} · ${energy}`
}

export function formatLiveCoachMessage(
  coaching: DayCoaching,
  entry: DayAnalysis['total'],
  summary: DailyFoodSummary,
  indiaHour: number,
  transcript?: string,
) {
  const wins = coaching.wins.slice(0, 2).map((win) => `✓ ${escapeHtml(win)}`).join('\n')
  const transcriptLine = transcript ? `\n🎙 <i>I heard:</i> “${escapeHtml(transcript)}”\n` : ''
  const followUp = coaching.follow_up_question
    ? `\n<b>Quick accuracy check</b>\n❓ ${escapeHtml(coaching.follow_up_question)}\n`
    : ''

  return `🌿 <b>${escapeHtml(coaching.chapter_title)}</b>
${escapeHtml(coaching.opening)}
${transcriptLine}
<b>JUST LOGGED</b>
<code>${entry.calories} kcal  │  P ${entry.protein}g  C ${entry.carbs}g  F ${entry.fat}g  Fi ${entry.fiber}g</code>

<b>TODAY SO FAR · ${summary.entries} check-in${summary.entries === 1 ? '' : 's'}</b>
${dailyDashboard(summary, indiaHour)}

<b>COACH’S READ</b>
${wins}
💡 ${escapeHtml(coaching.gentle_truth)}

<b>NEXT BEST MOVE</b>
→ ${escapeHtml(coaching.next_move)}

<i>${escapeHtml(remainingToday(summary))}</i>
<i>🟢 reached · 🟡 building · 🔴 needs attention now—not “bad food.” Estimates stay approximate.</i>${followUp}`.trim()
}

export function formatTodayCoachMessage(summary: DailyFoodSummary, indiaHour: number) {
  if (!summary.entries) {
    return `🌱 <b>Today is an open page</b>\nSend one messy line or a voice note whenever you eat. I’ll build the day with you.`
  }
  const foods = summary.foods.slice(0, 8).map(escapeHtml).join(' · ')
  return `📍 <b>Today so far · ${summary.entries} check-in${summary.entries === 1 ? '' : 's'}</b>
${foods ? `<i>${foods}</i>\n\n` : ''}${dailyDashboard(summary, indiaHour)}

<b>Still available today</b>
${escapeHtml(remainingToday(summary))}

<i>🟢 reached · 🟡 building · 🔴 needs attention now. Approximate, useful, never a grade.</i>`
}

export function formatCoachReply(reply: CoachReply, summary: DailyFoodSummary, indiaHour: number) {
  const nextMove = reply.next_move
    ? `\n\n<b>One useful move</b>\n→ ${escapeHtml(reply.next_move)}`
    : ''
  const today = summary.entries
    ? `\n\n<b>Your context today</b>\n${dailyDashboard(summary, indiaHour)}`
    : ''
  return `💬 <b>${escapeHtml(reply.headline)}</b>\n${escapeHtml(reply.message)}${nextMove}${today}`
}

export function formatPrivateQuestionReply(answer: string) {
  const safeAnswer = escapeHtml(answer.trim().slice(0, 3400))
  return `🧠 <b>Private side quest</b>\n${safeAnswer}\n\n<i>Not added to your food log or Calypso’s memory.</i>`
}

export function formatNightCheckIn(hook: string, summary: DailyFoodSummary) {
  if (!summary.entries) {
    return `🌙 <b>Tiny night check-in</b>
${escapeHtml(hook)}

Nothing is logged yet—and that’s just missing data, not a failed day.

<b>What did you eat today?</b>
Messy text or a voice note is perfect. Reply <code>skip</code> if tonight needs rest.`
  }

  return `🌙 <b>Anything else for today?</b>
${escapeHtml(hook)}

<b>I already have ${summary.entries} check-in${summary.entries === 1 ? '' : 's'}</b>
<code>${summary.calories} kcal  │  P ${summary.protein}g  C ${summary.carbs}g  F ${summary.fat}g  Fi ${summary.fiber}g</code>

Send anything missing—messy text or voice is perfect. If that’s everything, just say <code>done</code>.`
}
