import { createHash } from 'node:crypto'
import { isSealed, openJson, sealJson } from './crypto'
import { supabase } from './supabase'

export type CoachMessageRole = 'user' | 'assistant'
export type CoachMessageKind = 'food_log' | 'question' | 'day_complete' | 'other' | 'reminder'

export interface CoachMessage {
  id: string
  created_at: string
  date: string
  role: CoachMessageRole
  kind: CoachMessageKind
  content: string
  source_message_id?: number
}

interface CoachMessageRow {
  id: string
  created_at: string
  date: string
  role: CoachMessageRole
  kind: CoachMessageKind
  payload: string
  source_message_id?: number
}

function stableUuid(value: string) {
  const hash = createHash('sha256').update(value).digest('hex').slice(0, 32)
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20)}`
}

function chatKey(chatId: string | number) {
  const privacySalt = process.env.DATA_ENCRYPTION_KEY || 'calypso-conversation'
  return createHash('sha256').update(`${privacySalt}:${chatId}`).digest('hex')
}

function hydrateMessage(row: CoachMessageRow): CoachMessage {
  const payload = isSealed(row.payload)
    ? openJson<{ content: string }>(row.payload)
    : JSON.parse(row.payload) as { content: string }
  return {
    id: row.id,
    created_at: row.created_at,
    date: row.date,
    role: row.role,
    kind: row.kind,
    content: payload.content,
    source_message_id: row.source_message_id,
  }
}

export async function getCoachMessagesForDate({
  chatId,
  date,
  excludeSourceMessageId,
  limit = 40,
}: {
  chatId: string | number
  date: string
  excludeSourceMessageId?: number
  limit?: number
}) {
  let query = supabase
    .from('coach_messages')
    .select('id,created_at,date,role,kind,payload,source_message_id')
    .eq('chat_key', chatKey(chatId))
    .eq('date', date)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (excludeSourceMessageId !== undefined) {
    query = query.neq('source_message_id', excludeSourceMessageId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Conversation memory read failed:', error.message)
    return []
  }
  return (data || []).reverse().map((row) => hydrateMessage(row as CoachMessageRow))
}

export async function saveCoachMessage({
  chatId,
  date,
  role,
  kind,
  content,
  sourceMessageId,
}: {
  chatId: string | number
  date: string
  role: CoachMessageRole
  kind: CoachMessageKind
  content: string
  sourceMessageId?: number
}) {
  const idSeed = sourceMessageId === undefined
    ? `${chatId}:${role}:${Date.now()}:${content}`
    : `${chatId}:${sourceMessageId}:${role}`
  const { error } = await supabase.from('coach_messages').upsert({
    id: stableUuid(`calypso:${idSeed}`),
    date,
    chat_key: chatKey(chatId),
    source_message_id: sourceMessageId,
    role,
    kind,
    payload: sealJson({ content }),
  }, { onConflict: 'id' })

  if (error) console.error('Conversation memory write failed:', error.message)
}

function plainText(value: string) {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function coachConversationContext(messages: CoachMessage[]) {
  if (!messages.length) return 'No earlier conversation today.'
  return messages.map((message) => {
    const speaker = message.role === 'user' ? 'Shivam' : 'Calypso'
    return `${speaker}: ${plainText(message.content).slice(0, 1200)}`
  }).join('\n')
}
