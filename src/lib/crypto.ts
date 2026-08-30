import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const PREFIX = 'enc:v1'

function encryptionKey() {
  const configured = process.env.DATA_ENCRYPTION_KEY
  return configured ? createHash('sha256').update(configured).digest() : null
}

export function sealJson(value: unknown) {
  const key = encryptionKey()
  const plain = JSON.stringify(value)
  if (!key) return plain

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [PREFIX, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(':')
}

export function openJson<T>(value: string): T {
  if (!value.startsWith(`${PREFIX}:`)) return JSON.parse(value) as T
  const key = encryptionKey()
  if (!key) throw new Error('DATA_ENCRYPTION_KEY is required to read this log')

  const [, , ivText, tagText, encryptedText] = value.split(':')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivText, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
  const plain = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
  return JSON.parse(plain) as T
}

export function isSealed(value?: string | null) {
  return Boolean(value?.startsWith(`${PREFIX}:`))
}
