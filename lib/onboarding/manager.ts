import type { MagicLinkAuthConfig } from '@/lib/config'
import type { User, Organization } from '@/lib/types'
import { generateDisplayNameFromEmail } from '@/lib/crypto/token'
import { ROLE } from '@/lib/utils/constants'

export interface OnboardingResult {
  user: User
  organization: Organization
}

export class OnboardingManager {
  private onboardingTypeCache: Map<string, string> = new Map()

  constructor(private config: MagicLinkAuthConfig) {}

  async getOnboardingTypeId(name: string): Promise<string> {
    if (this.onboardingTypeCache.has(name)) {
      return this.onboardingTypeCache.get(name)!
    }

    const onboardingType = await this.config.database.onboardingTypes.findByName(name)

    if (!onboardingType) {
      throw new Error(`Onboarding type not found: ${name}`)
    }

    this.onboardingTypeCache.set(name, onboardingType.onboarding_type_id)
    return onboardingType.onboarding_type_id
  }

  async createOrgWithOnboarding(
    email: string,
    onboardingTypeName: string = 'Magic Link',
    firstName?: string,
    lastName?: string
  ): Promise<OnboardingResult> {
    const onboardingTypeId = await this.getOnboardingTypeId(onboardingTypeName)

    const orgName = `${email}'s Workspace`
    const orgSlug = this.generateOrgSlug(email)

    const organization = await this.config.database.organizations.create({
      name: orgName,
      slug: orgSlug,
      onboarding_type_id: onboardingTypeId
    })

    this.config.logger.info('[OnboardingManager] Organization created', {
      orgId: organization.org_id,
      slug: orgSlug,
      onboardingType: onboardingTypeName
    })

    // Generate display name based on available data
    let displayName: string
    if (firstName && lastName) {
      displayName = `${firstName} ${lastName.charAt(0)}.`
    } else if (firstName) {
      displayName = firstName
    } else {
      displayName = generateDisplayNameFromEmail(email)
    }

    const user = await this.config.database.users.create({
      email: email.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
      org_id: organization.org_id,
      role_id: ROLE.USER,
      preferences: {
        scope: ['demo_read', 'demo_analyze']
      }
    })

    this.config.logger.info('[OnboardingManager] User created', {
      userId: user.user_id,
      email: user.email,
      orgId: organization.org_id
    })

    if (this.config.callbacks?.onUserCreated) {
      await this.config.callbacks.onUserCreated(user)
    }

    return {
      user,
      organization
    }
  }

  private generateOrgSlug(email: string): string {
    const username = email.split('@')[0]
    const domain = email.split('@')[1]?.split('.')[0] || 'org'

    const baseSlug = `${username}-${domain}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const shortUuid = Math.random().toString(36).substring(2, 8)

    return `${baseSlug}-${shortUuid}`
  }
}
