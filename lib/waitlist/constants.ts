/**
 * Waitlist Module - Constants
 */

// ============================================================================
// WAITLIST STATUS
// ============================================================================

export const WAITLIST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export type WaitlistStatus = typeof WAITLIST_STATUS[keyof typeof WAITLIST_STATUS]

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGE = {
  EMAIL_ALREADY_REGISTERED: 'Email already registered',
  WAITLIST_ENTRY_NOT_FOUND: 'Waitlist entry not found',
  INVALID_REQUEST: 'Invalid request',
  REQUEST_FAILED: 'Request failed',
  SERVICE_UNAVAILABLE: 'Service unavailable',
  INTERNAL_ERROR: 'Internal server error',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
} as const

export type ErrorMessage = typeof ERROR_MESSAGE[keyof typeof ERROR_MESSAGE]

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const SUCCESS_MESSAGE = {
  WAITLIST_JOINED: 'Successfully joined the waitlist!',
  WAITLIST_APPROVED: 'Waitlist entry approved',
  WAITLIST_REJECTED: 'Waitlist entry rejected',
} as const

export type SuccessMessage = typeof SUCCESS_MESSAGE[keyof typeof SUCCESS_MESSAGE]
