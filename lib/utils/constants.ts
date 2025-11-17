/**
 * Application Constants
 */

// ============================================================================
// RETRY AND FETCH CONFIGURATION
// ============================================================================

/**
 * Default maximum number of retry attempts for operations
 */
export const DEFAULT_MAX_RETRY_ATTEMPTS = 3

/**
 * Default base delay in milliseconds for exponential backoff retries
 */
export const DEFAULT_RETRY_BASE_DELAY_MS = 500

/**
 * Default base delay in milliseconds for fetch retry operations
 */
export const DEFAULT_FETCH_RETRY_BASE_DELAY_MS = 300

// ============================================================================
// SESSION AND AUTHENTICATION
// ============================================================================

export const COOKIE_NAME = {
  SESSION: 'app_session',
} as const

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 24 * 60 * 60, // 24 hours in seconds
} as const

export const ROLE = {
  ADMIN: 1,
  USER: 2,
} as const

export type RoleId = typeof ROLE[keyof typeof ROLE]

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGE = {
  RATE_LIMIT_EXCEEDED: 'AI service rate limit exceeded. Please try again in a few moments.',
} as const
