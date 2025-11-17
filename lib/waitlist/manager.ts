import type { MagicLinkAuthConfig, DatabaseAdapter, Logger, Callbacks } from '@/lib/config'
import type { WaitlistEntry, CreateWaitlistData, WaitlistFilters } from '@/lib/types'

export interface WaitlistManagerConfig {
  database: DatabaseAdapter
  logger: Logger
  callbacks?: Callbacks
}

export class WaitlistManager {
  constructor(private config: WaitlistManagerConfig | MagicLinkAuthConfig) {}

  async submitEntry(data: CreateWaitlistData): Promise<WaitlistEntry> {
    const existing = await this.config.database.waitlist.findByEmail(data.email)

    if (existing) {
      this.config.logger.warn('[WaitlistManager] Duplicate email', { email: data.email })
      throw new Error('Email already registered on waitlist')
    }

    const entry = await this.config.database.waitlist.create(data)

    this.config.logger.info('[WaitlistManager] New entry created', {
      waitlistId: entry.waitlist_id,
      email: entry.email
    })

    if (this.config.callbacks?.onWaitlistJoin) {
      await this.config.callbacks.onWaitlistJoin(entry)
    }

    return entry
  }

  async listEntries(filters?: WaitlistFilters): Promise<WaitlistEntry[]> {
    return await this.config.database.waitlist.list(filters)
  }

  async approveEntry(waitlistId: string, inviteId: string): Promise<void> {
    await this.config.database.waitlist.approve(waitlistId, inviteId)

    this.config.logger.info('[WaitlistManager] Entry approved', {
      waitlistId,
      inviteId
    })
  }

  async rejectEntry(waitlistId: string): Promise<void> {
    await this.config.database.waitlist.reject(waitlistId)

    this.config.logger.info('[WaitlistManager] Entry rejected', { waitlistId })
  }
}
