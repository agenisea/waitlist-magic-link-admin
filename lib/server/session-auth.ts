/**
 * Server-side session token management using JWT with RSA-2048
 *
 * Tokens are stateless JWTs signed with RSA private key and verified with public key.
 * This provides enterprise-grade auth that scales horizontally and survives server restarts.
 */

import jwt from 'jsonwebtoken'
import { type NextRequest } from 'next/server'
import { COOKIE_NAME } from '@/lib/utils/constants'

/**
 * Session token schema
 *
 * When schema changes, increment CURRENT_SESSION_SCHEMA_VERSION.
 * Old tokens will be rejected and users must re-authenticate.
 */

interface SessionTokenPayload {
  schemaVersion: number
  ip: string
  userAgent: string
  orgId: string
  userId: string
  roleId: number
  displayName?: string | null
  iat?: number
  exp?: number
}

const CURRENT_SESSION_SCHEMA_VERSION = 4 as const

const TOKEN_EXPIRATION_SECONDS = 24 * 60 * 60

/**
 * Get JWT private key from environment (runtime validation)
 * Throws error only when actually used, not at build time
 */
function getJwtPrivateKey(): string {
  const key = process.env.JWT_PRIVATE_KEY
  if (!key) {
    throw new Error('[access-tokens] JWT_PRIVATE_KEY must be set in environment')
  }
  return key
}

/**
 * Get JWT public key from environment (runtime validation)
 * Throws error only when actually used, not at build time
 */
function getJwtPublicKey(): string {
  const key = process.env.JWT_PUBLIC_KEY
  if (!key) {
    throw new Error('[access-tokens] JWT_PUBLIC_KEY must be set in environment')
  }
  return key
}

/**
 * Create a new session token (JWT)
 */
export function createSessionToken(ip: string, userAgent: string, orgId: string, userId: string, roleId: number, displayName?: string | null): string {
  const payload: SessionTokenPayload = {
    schemaVersion: CURRENT_SESSION_SCHEMA_VERSION,
    ip,
    userAgent,
    orgId,
    userId,
    roleId,
    displayName: displayName || null,
  }

  const token = jwt.sign(payload, getJwtPrivateKey(), {
    algorithm: 'RS256',
    expiresIn: TOKEN_EXPIRATION_SECONDS,
  })

  return token
}

/**
 * Verify and extract session token payload (single verification)
 *
 * Validates signature, expiration, and schema version.
 * Tokens with outdated schema versions are rejected - users must re-authenticate.
 *
 * @returns Payload if valid, null if invalid/expired/outdated
 */
export function verifySessionToken(token: string): SessionTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtPublicKey(), {
      algorithms: ['RS256'],
    })

    if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
      return null
    }

    const payload = decoded as SessionTokenPayload

    if (!payload.schemaVersion) {
      console.log('[access-tokens] Missing schema version')
      return null
    }

    // Only accept current schema version - reject all outdated tokens
    if (payload.schemaVersion !== CURRENT_SESSION_SCHEMA_VERSION) {
      console.log('[access-tokens] Outdated token schema - user must log in again')
      return null
    }

    return payload

  } catch (error) {
    if (error instanceof Error) {
      console.log('[access-tokens] Token verification failed:', error.message)
    }
    return null
  }
}

/**
 * Authenticate request using session cookie
 *
 * Best practice helper for API endpoints after HTTP-only cookie migration:
 * 1. Extracts JWT from session cookie
 * 2. Validates signature, expiration, and schema
 * 3. Returns typed payload with orgId and userId
 *
 * Security: Returns generic "Unauthorized" error to prevent information disclosure.
 *
 * @example
 * ```typescript
 * const auth = authenticateWithCookie(request)
 * if (!auth.valid) {
 *   return auth.response
 * }
 * const { orgId, userId } = auth.payload
 * ```
 */
export function authenticateWithCookie(request: NextRequest):
  | { valid: true; payload: SessionTokenPayload }
  | { valid: false; response: Response } {

  const sessionCookie = request.cookies.get(COOKIE_NAME.SESSION)

  if (!sessionCookie?.value) {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  const payload = verifySessionToken(sessionCookie.value)

  if (!payload) {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  return { valid: true, payload }
}

/**
 * Get session from cookies (for server components)
 * Returns the session payload or null if invalid/missing
 */
export async function getServerSession(): Promise<SessionTokenPayload | null> {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(COOKIE_NAME.SESSION)

  if (!sessionCookie?.value) {
    return null
  }

  return verifySessionToken(sessionCookie.value)
}
