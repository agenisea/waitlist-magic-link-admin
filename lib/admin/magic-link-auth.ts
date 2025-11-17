import type { MagicLinkAuthConfig } from '@/lib/config'
import { MagicLinkEventEmitter } from '@/lib/events/emitter'
import { InviteManager } from '@/lib/invites/manager'
import { WaitlistManager } from '@/lib/waitlist/manager'
import { OnboardingManager } from '@/lib/onboarding/manager'
import { RateLimiter } from '@/lib/rate-limit/limiter'
import { getDefaultConfig } from '@/lib/config/defaults'

export class MagicLinkAuth {
  public readonly events: MagicLinkEventEmitter
  public readonly invites: InviteManager
  public readonly waitlist: WaitlistManager
  public readonly onboarding: OnboardingManager
  public readonly rateLimiter: RateLimiter
  private config: MagicLinkAuthConfig

  constructor(config: MagicLinkAuthConfig) {
    const defaults = getDefaultConfig()
    this.config = { ...defaults, ...config } as MagicLinkAuthConfig

    this.events = new MagicLinkEventEmitter()
    this.invites = new InviteManager(this.config)
    this.waitlist = new WaitlistManager(this.config)
    this.onboarding = new OnboardingManager(this.config)
    this.rateLimiter = new RateLimiter(this.config.rateLimits)

    // Only log during runtime, not during build
    if (typeof window !== 'undefined' || process.env.NEXT_PHASE !== 'phase-production-build') {
      this.config.logger.info('[MagicLinkAuth] Module initialized', {
        features: this.config.features,
        rateLimits: this.config.rateLimits
      })
    }
  }

  getConfig(): MagicLinkAuthConfig {
    return this.config
  }

  destroy(): void {
    this.rateLimiter.destroy()
    this.events.removeAllListeners()
    this.config.logger.info('[MagicLinkAuth] Module destroyed')
  }
}

export function createMagicLinkAuth(config: MagicLinkAuthConfig): MagicLinkAuth {
  return new MagicLinkAuth(config)
}

export * from '@/lib/types'
export * from '@/lib/types/events'
export * from '@/lib/config'
