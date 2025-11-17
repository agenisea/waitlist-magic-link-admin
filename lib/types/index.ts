import type { WaitlistStatus as WaitlistStatusConst, InviteStatus, RoleId } from '@/lib/admin/constants'

export type WaitlistStatus = WaitlistStatusConst

export interface User {
  user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  avatar_url: string | null
  org_id: string
  role_id: RoleId
  preferences: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface OnboardingType {
  onboarding_type_id: string
  name: string
  created_at: Date
}

export interface Organization {
  org_id: string
  name: string
  slug: string
  onboarding_type_id: string | null
  settings: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface Invite {
  invite_id: string
  email: string
  first_name: string | null
  last_name: string | null
  token_hash: string
  url_slug: string
  expires_at: Date
  max_uses: number
  current_uses: number
  revoked: boolean
  purpose: string
  sent_by_user_id: string | null
  ua_hash: string | null
  ip_prefix: string | null
  used_at: Date | null
  used_ua_hash: string | null
  used_ip_prefix: string | null
  created_at: Date
}

export interface WaitlistEntry {
  waitlist_id: string
  first_name: string | null
  last_name: string | null
  email: string
  organization_name: string | null
  job_title: string | null
  interest_reason: string | null
  use_case: string | null
  feedback_importance: number | null
  subscribe_newsletter: boolean
  status: WaitlistStatus
  invite_id: string | null
  created_at: Date
  updated_at: Date
}

export interface CreateInviteData {
  email: string
  first_name?: string
  last_name?: string
  token_hash: string
  url_slug: string
  expires_at: Date
  max_uses: number
  purpose: string
  sent_by_user_id?: string
  ua_hash?: string
  ip_prefix?: string
}

export interface CreateWaitlistData {
  first_name?: string
  last_name?: string
  email: string
  organization_name?: string
  job_title?: string
  interest_reason?: string
  use_case?: string
  feedback_importance?: number
  subscribe_newsletter: boolean
}

export interface CreateUserData {
  email: string
  first_name?: string
  last_name?: string
  display_name?: string
  avatar_url?: string
  org_id: string
  role_id: RoleId
  preferences?: Record<string, any>
}

export interface UpdateUserData {
  first_name?: string
  last_name?: string
  display_name?: string
  avatar_url?: string
  preferences?: Record<string, any>
}

export interface CreateOrgData {
  name: string
  slug: string
  onboarding_type_id?: string
  settings?: Record<string, any>
}

export interface InviteFilters {
  status?: InviteStatus
  email?: string
  sent_by_user_id?: string
}

export interface WaitlistFilters {
  status?: WaitlistStatus
  dateFrom?: Date
  dateTo?: Date
}
