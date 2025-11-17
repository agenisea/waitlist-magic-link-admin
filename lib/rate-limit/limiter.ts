import type { RateLimitConfig } from '@/lib/config'

interface RateLimitEntry {
  count: number
  resetAt: number
}

export type RateLimitType = 'waitlist' | 'auth' | 'api' | 'admin'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  headers: Record<string, string>
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor(private config: RateLimitConfig) {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
  }

  private getLimit(type: RateLimitType): { limit: number; windowSeconds: number } {
    switch (type) {
      case 'waitlist':
        return { limit: this.config.waitlistPerHour, windowSeconds: 3600 }
      case 'auth':
        return { limit: this.config.authPerMinute, windowSeconds: 60 }
      case 'api':
        return { limit: this.config.apiPerMinute, windowSeconds: 60 }
      case 'admin':
        return { limit: this.config.adminPerMinute, windowSeconds: 60 }
    }
  }

  check(ip: string, type: RateLimitType): RateLimitResult {
    const { limit, windowSeconds } = this.getLimit(type)
    const key = `${ip}:${type}`
    const now = Date.now()
    const windowMs = windowSeconds * 1000

    const entry = this.store.get(key)

    if (!entry || entry.resetAt < now) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + windowMs
      }
      this.store.set(key, newEntry)

      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: newEntry.resetAt,
        headers: this.createHeaders(limit, limit - 1, newEntry.resetAt)
      }
    }

    if (entry.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        headers: this.createHeaders(limit, 0, entry.resetAt)
      }
    }

    entry.count++
    this.store.set(key, entry)

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
      headers: this.createHeaders(limit, limit - entry.count, entry.resetAt)
    }
  }

  private createHeaders(limit: number, remaining: number, resetAt: number): Record<string, string> {
    return {
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.floor(resetAt / 1000))
    }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(key)
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.store.clear()
  }
}
