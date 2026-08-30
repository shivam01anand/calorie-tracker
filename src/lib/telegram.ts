import { createHash } from 'node:crypto'
import type { DayCoaching } from './gemini'

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

export async function sendTelegramMessage(chatId: string | number, text: string) {
  return telegramCall('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
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
