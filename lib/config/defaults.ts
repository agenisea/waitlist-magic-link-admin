import type { MagicLinkAuthConfig } from './index'

export function getDefaultConfig(): Partial<MagicLinkAuthConfig> {
  return {
    authLinkExpiryMinutes: 15,
    betaLinkExpiryHours: 48,
    sessionExpiryHours: 24,
    rateLimits: {
      waitlistPerHour: 3,
      authPerMinute: 5,
      apiPerMinute: 30,
      adminPerMinute: 10
    },
    features: {
      waitlistEnabled: true,
      embedEnabled: true,
      adminUIEnabled: true
    },
    logger: console,
    allowedEmbedOrigins: []
  }
}
