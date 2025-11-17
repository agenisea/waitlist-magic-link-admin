/**
 * Magic Link Authentication Module - Constants
 * Admin-specific constants for magic link authentication
 *
 * Organized by concern:
 * - API Routes and HTTP Methods
 * - Status Values (Invite)
 * - Event Types
 * - Cookie and Session
 * - Database Schema
 * - User Roles
 */

// ============================================================================
// IMPORTS
// ============================================================================

import {
  WAITLIST_STATUS,
  type WaitlistStatus,
  ERROR_MESSAGE as WAITLIST_ERROR_MESSAGE,
  SUCCESS_MESSAGE as WAITLIST_SUCCESS_MESSAGE,
} from '@/lib/waitlist/constants'

export { COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/utils/constants'
export { ROLE, type RoleId } from '@/lib/utils/constants'

// ============================================================================
// SHARED CONSTANTS (re-exported from waitlist module)
// ============================================================================

export { WAITLIST_STATUS, type WaitlistStatus }

// ============================================================================
// API ROUTES AND HTTP METHODS
// ============================================================================

export const API_BASE_PATH = '/api/magic-link' as const

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH_ACCEPT: 'auth/accept',
  AUTH_LOGOUT: 'auth/logout',

  // Waitlist endpoints
  WAITLIST_JOIN: 'waitlist/join',

  // Admin invite endpoints
  ADMIN_INVITES_CREATE: 'admin/invites/create',
  ADMIN_INVITES_REVOKE: 'admin/invites/revoke',
  ADMIN_INVITES_RESEND: 'admin/invites/resend',
  ADMIN_INVITES_LIST: 'admin/invites/list',

  // Admin waitlist endpoints
  ADMIN_WAITLIST_LIST: 'admin/waitlist/list',
  ADMIN_WAITLIST_APPROVE: 'admin/waitlist/approve',
  ADMIN_WAITLIST_REJECT: 'admin/waitlist/reject',
} as const

// ============================================================================
// INVITE STATUS
// ============================================================================

export const INVITE_STATUS = {
  ACTIVE: 'active',
  USED: 'used',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const

export type InviteStatus = typeof INVITE_STATUS[keyof typeof INVITE_STATUS]

// ============================================================================
// EVENT TYPES
// ============================================================================

export const EVENT_TYPE = {
  // Invite events
  INVITE_CREATED: 'invite.created',
  INVITE_ACCEPTED: 'invite.accepted',
  INVITE_REVOKED: 'invite.revoked',
  INVITE_EXPIRED: 'invite.expired',

  // Waitlist events
  WAITLIST_JOINED: 'waitlist.joined',
  WAITLIST_APPROVED: 'waitlist.approved',
  WAITLIST_REJECTED: 'waitlist.rejected',

  // User events
  USER_CREATED: 'user.created',
} as const

export type EventType = typeof EVENT_TYPE[keyof typeof EVENT_TYPE]

// ============================================================================
// ONBOARDING TYPES
// ============================================================================

export const ONBOARDING_TYPE = {
  MAGIC_LINK: 'Magic Link',
} as const

export type OnboardingType = typeof ONBOARDING_TYPE[keyof typeof ONBOARDING_TYPE]

// ============================================================================
// ERROR MESSAGES
// ============================================================================

/**
 * Admin-specific error messages merged with shared waitlist errors
 */
export const ERROR_MESSAGE = {
  // Shared waitlist errors
  ...WAITLIST_ERROR_MESSAGE,

  // Admin-specific invite errors
  INVITE_NOT_FOUND: 'Invite not found or already used',
  INVITE_REVOKED: 'This invite has been revoked',
  INVITE_EXPIRED: 'This invite has expired',
  INVITE_ALREADY_USED: 'This invite has already been used',
  INVALID_TOKEN: 'Invalid or missing token',

  // Admin-specific auth errors
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Insufficient permissions',
  INVALID_SESSION: 'Invalid or expired session',
} as const

export type ErrorMessage = typeof ERROR_MESSAGE[keyof typeof ERROR_MESSAGE]

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

/**
 * Admin-specific success messages merged with shared waitlist messages
 */
export const SUCCESS_MESSAGE = {
  // Shared waitlist messages
  ...WAITLIST_SUCCESS_MESSAGE,

  // Admin-specific messages
  INVITE_CREATED: 'Invite created successfully',
  INVITE_REVOKED: 'Invite revoked successfully',
  LOGOUT_SUCCESS: 'Successfully logged out',
} as const

export type SuccessMessage = typeof SUCCESS_MESSAGE[keyof typeof SUCCESS_MESSAGE]
