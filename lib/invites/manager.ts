import type { MagicLinkAuthConfig } from '@/lib/config'
import type { Invite } from '@/lib/types'
import { generateToken, generateUrlSlug, hmacToken } from '@/lib/crypto/token'

export interface CreateInviteOptions {
  email: string
  firstName?: string
  lastName?: string
  expiresInMinutes?: number
  maxUses?: number
  purpose?: string
  sentByUserId?: string
  request?: Request
}

export interface InviteResult {
  inviteId: string
  slug: string
  token: string
  magicLink: string
  expiresAt: Date
  expiresInMinutes: number
  maxUses: number
}

export class InviteManager {
  constructor(private config: MagicLinkAuthConfig) {}

  async createInvite(options: CreateInviteOptions): Promise<InviteResult> {
    const {
      email,
      firstName,
      lastName,
      expiresInMinutes = this.config.authLinkExpiryMinutes,
      maxUses = 3,
      purpose = 'invite',
      sentByUserId,
      request
    } = options

    const token = generateToken()
    const tokenHash = hmacToken(token, this.config.tokenPepper)
    const urlSlug = generateUrlSlug()

    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes)

    let uaHash: string | undefined
    let ipPrefix: string | undefined

    if (request) {
      const ua = request.headers.get('user-agent')
      const ip = request.headers.get('x-forwarded-for') || 'unknown'

      if (ua) {
        const { hashUserAgent } = await import('../crypto/token')
        uaHash = hashUserAgent(ua)
      }

      const { getIpPrefix } = await import('../crypto/token')
      ipPrefix = getIpPrefix(ip)
    }

    const invite = await this.config.database.invites.create({
      email: email.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      token_hash: tokenHash,
      url_slug: urlSlug,
      expires_at: expiresAt,
      max_uses: maxUses,
      purpose,
      sent_by_user_id: sentByUserId,
      ua_hash: uaHash,
      ip_prefix: ipPrefix
    })

    const magicLink = `${this.config.appUrl}/magic-link/accept/${urlSlug}#t=${token}`

    this.config.logger.info('[InviteManager] Invite created', {
      inviteId: invite.invite_id,
      email,
      slug: urlSlug,
      expiresInMinutes
    })

    // Call onInviteCreated callback if provided
    if (this.config.callbacks?.onInviteCreated) {
      await this.config.callbacks.onInviteCreated({
        invite,
        magicLink,
        expiresInMinutes
      })
    }

    return {
      inviteId: invite.invite_id,
      slug: urlSlug,
      token,
      magicLink,
      expiresAt,
      expiresInMinutes,
      maxUses: invite.max_uses
    }
  }

  async validateInvite(slug: string): Promise<Invite | null> {
    const invite = await this.config.database.invites.findBySlug(slug)

    if (!invite) {
      this.config.logger.warn('[InviteManager] Invite not found', { slug })
      return null
    }

    if (invite.revoked) {
      this.config.logger.warn('[InviteManager] Invite revoked', { slug, inviteId: invite.invite_id })
      return null
    }

    if (invite.expires_at < new Date()) {
      this.config.logger.warn('[InviteManager] Invite expired', { slug, inviteId: invite.invite_id })
      return null
    }

    if (invite.current_uses >= invite.max_uses) {
      this.config.logger.warn('[InviteManager] Invite usage limit reached', {
        slug,
        inviteId: invite.invite_id,
        currentUses: invite.current_uses,
        maxUses: invite.max_uses
      })
      return null
    }

    return invite
  }

  async consumeInvite(slug: string, token: string, request: Request): Promise<Invite | null> {
    const tokenHash = hmacToken(token, this.config.tokenPepper)

    const ua = request.headers.get('user-agent') || ''
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    const { hashUserAgent, getIpPrefix } = await import('../crypto/token')
    const uaHash = hashUserAgent(ua)
    const ipPrefix = getIpPrefix(ip)

    const invite = await this.config.database.invites.atomicConsume(
      slug,
      tokenHash,
      uaHash,
      ipPrefix
    )

    if (!invite) {
      this.config.logger.error('[InviteManager] Failed to consume invite', {
        slug,
        reason: 'atomic_consume_failed'
      })
      return null
    }

    this.config.logger.info('[InviteManager] Invite consumed successfully', {
      inviteId: invite.invite_id,
      email: invite.email,
      slug
    })

    return invite
  }

  async revokeInvite(inviteId: string): Promise<void> {
    await this.config.database.invites.revoke(inviteId)

    this.config.logger.info('[InviteManager] Invite revoked', { inviteId })
  }

  async listInvites(filters?: { status?: 'active' | 'used' | 'expired' | 'revoked' }): Promise<Invite[]> {
    return await this.config.database.invites.list(filters)
  }

  getInviteStatus(invite: Invite): 'active' | 'used' | 'expired' | 'revoked' {
    if (invite.revoked) return 'revoked'
    if (invite.used_at) return 'used'
    if (invite.expires_at < new Date()) return 'expired'
    return 'active'
  }
}
