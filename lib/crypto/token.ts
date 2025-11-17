import crypto from 'crypto'

export function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function hmacToken(token: string, pepper: string): string {
  return crypto
    .createHmac('sha256', pepper)
    .update(token)
    .digest('base64url')
}

export function generateUrlSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let slug = ''
  const bytes = crypto.randomBytes(10)
  for (let i = 0; i < 10; i++) {
    const byte = bytes[i]
    if (byte !== undefined) {
      slug += chars[byte % chars.length]
    }
  }
  return slug
}

export function hashUserAgent(ua: string): string {
  return crypto.createHash('sha256').update(ua).digest('hex').substring(0, 16)
}

export function getIpPrefix(ip: string): string {
  const parts = ip.split('.')
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`
  }
  return ip.split(':').slice(0, 3).join(':') + '::'
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return crypto.timingSafeEqual(new Uint8Array(bufA), new Uint8Array(bufB))
}

export function generateDisplayNameFromEmail(email: string): string {
  const username = email.split('@')[0]
  if (!username) {
    return email
  }
  return username
    .split(/[._-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
