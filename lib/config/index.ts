import type {
  User,
  Organization,
  OnboardingType,
  Invite,
  WaitlistEntry,
  CreateInviteData,
  CreateWaitlistData,
  CreateUserData,
  UpdateUserData,
  CreateOrgData,
  InviteFilters,
  WaitlistFilters
} from '@/lib/types'

export interface InviteRepository {
  create(data: CreateInviteData): Promise<Invite>
  findBySlug(slug: string): Promise<Invite | null>
  atomicConsume(slug: string, tokenHash: string, uaHash: string, ipPrefix: string): Promise<Invite | null>
  revoke(inviteId: string): Promise<void>
  list(filters?: InviteFilters): Promise<Invite[]>
}

export interface WaitlistRepository {
  create(data: CreateWaitlistData): Promise<WaitlistEntry>
  findByEmail(email: string): Promise<WaitlistEntry | null>
  list(filters?: WaitlistFilters): Promise<WaitlistEntry[]>
  approve(waitlistId: string, inviteId: string): Promise<void>
  reject(waitlistId: string): Promise<void>
}

export interface UserRepository {
  create(data: CreateUserData): Promise<User>
  findByEmail(email: string, orgId: string): Promise<User | null>
  findByEmailGlobal(email: string): Promise<User | null>
  findById(userId: string): Promise<User | null>
  update(userId: string, data: UpdateUserData): Promise<User>
}

export interface OrganizationRepository {
  create(data: CreateOrgData): Promise<Organization>
  findBySlug(slug: string): Promise<Organization | null>
  findById(orgId: string): Promise<Organization | null>
}

export interface OnboardingTypeRepository {
  findByName(name: string): Promise<OnboardingType | null>
}

export interface DatabaseAdapter {
  invites: InviteRepository
  waitlist: WaitlistRepository
  users: UserRepository
  organizations: OrganizationRepository
  onboardingTypes: OnboardingTypeRepository
}

export interface Logger {
  info(message: string, meta?: any): void
  error(message: string, meta?: any): void
  warn(message: string, meta?: any): void
  debug(message: string, meta?: any): void
}

export interface RateLimitConfig {
  waitlistPerHour: number
  authPerMinute: number
  apiPerMinute: number
  adminPerMinute: number
}

export interface FeatureFlags {
  waitlistEnabled: boolean
  embedEnabled: boolean
  adminUIEnabled: boolean
}

export interface InviteCreatedData {
  invite: Invite
  magicLink: string
  expiresInMinutes: number
}

export interface Callbacks {
  onUserCreated?: (user: User) => Promise<void>
  onInviteCreated?: (data: InviteCreatedData) => Promise<void>
  onInviteAccepted?: (invite: Invite) => Promise<void>
  onWaitlistJoin?: (entry: WaitlistEntry) => Promise<void>
}

export interface MagicLinkAuthConfig {
  database: DatabaseAdapter
  tokenPepper: string
  jwtPrivateKey: string
  jwtPublicKey: string
  appUrl: string
  allowedEmbedOrigins: string[]
  authLinkExpiryMinutes: number
  betaLinkExpiryHours: number
  sessionExpiryHours: number
  rateLimits: RateLimitConfig
  features: FeatureFlags
  callbacks?: Callbacks
  logger: Logger
}
