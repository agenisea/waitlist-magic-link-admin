import { NextRequest } from 'next/server'

export interface OriginCheckResult {
  allowed: boolean
  origin?: string
}

/**
 * Validate request origin against allowed origins list
 *
 * Provides CSRF protection by checking Origin/Referer headers
 * against whitelist of allowed domains.
 *
 * @param request - Next.js request object
 * @param allowedOrigins - Array of allowed origin URLs (e.g., ['https://app.example.com'])
 * @returns Object with allowed boolean and detected origin
 */
export function validateOrigin(
  request: NextRequest,
  allowedOrigins: string[]
): OriginCheckResult {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  if (!origin && !referer) {
    return { allowed: false }
  }

  const requestOrigin = origin || (referer ? new URL(referer).origin : null)

  if (!requestOrigin) {
    return { allowed: false }
  }

  const isAllowed = allowedOrigins.some(allowed => {
    try {
      const allowedUrl = new URL(allowed)
      const requestUrl = new URL(requestOrigin)
      return allowedUrl.origin === requestUrl.origin
    } catch {
      return false
    }
  })

  return {
    allowed: isAllowed,
    origin: requestOrigin
  }
}

/**
 * Get list of allowed origins from configuration
 *
 * Combines appUrl with additional allowed origins from environment
 *
 * @param appUrl - Primary application URL
 * @param additionalOrigins - Additional allowed origins from config
 * @returns Array of allowed origin URLs
 */
export function getAllowedOrigins(
  appUrl: string,
  additionalOrigins: string[] = []
): string[] {
  const origins = [appUrl]

  const envOrigins = process.env.ALLOWED_ORIGINS?.split(',')
    .map(o => o.trim())
    .filter(Boolean) || []

  return [...origins, ...additionalOrigins, ...envOrigins]
}
