import type { WaitlistStatus } from '@/lib/types'
import { retryFetch } from '@/lib/utils/fetch'
import { DEFAULT_MAX_RETRY_ATTEMPTS, DEFAULT_FETCH_RETRY_BASE_DELAY_MS } from '@/lib/utils/constants'
import { API_BASE_PATH, API_ENDPOINTS, INVITE_STATUS, type InviteStatus } from '@/lib/admin/constants'

const RETRY_OPTIONS = { maxAttempts: DEFAULT_MAX_RETRY_ATTEMPTS, baseDelayMs: DEFAULT_FETCH_RETRY_BASE_DELAY_MS }

export interface AdminInvite {
  inviteId: string
  email: string
  slug: string
  status: InviteStatus
  expiresAt: string
  maxUses: number
  currentUses: number
  purpose: string
  createdAt: string
  usedAt: string | null
}

export interface WaitlistEntry {
  waitlistId: string
  firstName: string | null
  lastName: string | null
  email: string
  organizationName: string | null
  jobTitle: string | null
  interestReason: string | null
  useCase: string | null
  feedbackImportance: number | null
  status: WaitlistStatus
  inviteId: string | null
  createdAt: string
}

export interface CreateInviteRequest {
  email: string
  firstName?: string
  lastName?: string
  expiresInMinutes?: number
  maxUses?: number
  purpose?: string
}

export interface CreateInviteResponse {
  success: boolean
  invite?: {
    inviteId: string
    slug: string
    magicLink: string
    expiresAt: string
    expiresInMinutes: number
    maxUses: number
  }
  error?: string
}

export interface ListInvitesResponse {
  success: boolean
  invites?: AdminInvite[]
  error?: string
}

export interface ListWaitlistResponse {
  success: boolean
  entries?: WaitlistEntry[]
  error?: string
}

export interface ApproveWaitlistResponse {
  success: boolean
  inviteId?: string
  magicLink?: string
  expiresInMinutes?: number
  maxUses?: number
  error?: string
}

export interface GenericResponse {
  success: boolean
  error?: string
}

export async function createInvite(data: CreateInviteRequest): Promise<CreateInviteResponse> {
  const response = await retryFetch(
    `${API_BASE_PATH}/${API_ENDPOINTS.ADMIN_INVITES_CREATE}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    },
    RETRY_OPTIONS
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    return { success: false, error: error.error || `HTTP ${response.status}` }
  }

  return response.json()
}

export async function revokeInvite(inviteId: string): Promise<GenericResponse> {
  const response = await retryFetch(
    `${API_BASE_PATH}/${API_ENDPOINTS.ADMIN_INVITES_REVOKE}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ inviteId })
    },
    RETRY_OPTIONS
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    return { success: false, error: error.error || `HTTP ${response.status}` }
  }

  return response.json()
}

export async function listInvites(status?: InviteStatus): Promise<ListInvitesResponse> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)

  const response = await retryFetch(
    `${API_BASE_PATH}/${API_ENDPOINTS.ADMIN_INVITES_LIST}?${params}`,
    {
      credentials: 'include'
    },
    RETRY_OPTIONS
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    return { success: false, error: error.error || `HTTP ${response.status}` }
  }

  return response.json()
}

export async function listWaitlist(filters?: { status?: WaitlistStatus }): Promise<ListWaitlistResponse> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)

  const response = await retryFetch(
    `${API_BASE_PATH}/${API_ENDPOINTS.ADMIN_WAITLIST_LIST}?${params}`,
    {
      credentials: 'include'
    },
    RETRY_OPTIONS
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    return { success: false, error: error.error || `HTTP ${response.status}` }
  }

  return response.json()
}

export async function approveWaitlist(waitlistId: string): Promise<ApproveWaitlistResponse> {
  const response = await retryFetch(
    `${API_BASE_PATH}/${API_ENDPOINTS.ADMIN_WAITLIST_APPROVE}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ waitlistId })
    },
    RETRY_OPTIONS
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    return { success: false, error: error.error || `HTTP ${response.status}` }
  }

  return response.json()
}

export async function rejectWaitlist(waitlistId: string): Promise<GenericResponse> {
  const response = await retryFetch(
    `${API_BASE_PATH}/${API_ENDPOINTS.ADMIN_WAITLIST_REJECT}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ waitlistId })
    },
    RETRY_OPTIONS
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    return { success: false, error: error.error || `HTTP ${response.status}` }
  }

  return response.json()
}

export interface ResendInviteResponse {
  success: boolean
  invite?: {
    inviteId: string
    slug: string
    magicLink: string
    expiresAt: string
    expiresInMinutes: number
    maxUses: number
  }
  revokedCount?: number
  error?: string
}

export async function resendInvite(email: string): Promise<ResendInviteResponse> {
  const response = await retryFetch(
    `${API_BASE_PATH}/${API_ENDPOINTS.ADMIN_INVITES_RESEND}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email })
    },
    RETRY_OPTIONS
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    return { success: false, error: error.error || `HTTP ${response.status}` }
  }

  return response.json()
}
