import { NextRequest, NextResponse } from 'next/server'
import type { MagicLinkAuth } from '@/lib/admin/magic-link-auth'
import type { User, Organization } from '@/lib/types'
import { createSessionToken } from '@/lib/server/session-auth'
import { validateOrigin, getAllowedOrigins } from '@/lib/security/csrf'
import {
  ERROR_MESSAGE,
  EVENT_TYPE,
  ONBOARDING_TYPE,
  COOKIE_NAME,
  SESSION_COOKIE_OPTIONS
} from '@/lib/admin/constants'

export function createAcceptHandlers(auth: MagicLinkAuth) {
  const config = auth.getConfig()

  async function handleAccept(request: NextRequest): Promise<NextResponse> {
    const allowedOrigins = getAllowedOrigins(config.appUrl, config.allowedEmbedOrigins)
    const originCheck = validateOrigin(request, allowedOrigins)

    if (!originCheck.allowed) {
      config.logger.warn('[AcceptHandler] Origin validation failed', { origin: originCheck.origin })
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGE.FORBIDDEN },
        { status: 403 }
      )
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    const rateLimit = auth.rateLimiter.check(ip, 'auth')

    if (!rateLimit.allowed) {
      config.logger.warn('[AcceptHandler] Rate limit exceeded', { ip })
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGE.RATE_LIMIT_EXCEEDED },
        { status: 429, headers: rateLimit.headers }
      )
    }

    try {
      const body = await request.json()
      const { slug, token } = body

      if (!slug || !token) {
        config.logger.warn('[AcceptHandler] Missing slug or token', { slug: !!slug, token: !!token })
        return NextResponse.json(
          { success: false, error: ERROR_MESSAGE.INVALID_REQUEST },
          { status: 400 }
        )
      }

      const invite = await auth.invites.consumeInvite(slug, token, request)

      if (!invite) {
        const existingInvite = await config.database.invites.findBySlug(slug)

        if (!existingInvite) {
          config.logger.warn('[AcceptHandler] Invite not found', { slug })
          return NextResponse.json(
            { success: false, error: ERROR_MESSAGE.INVITE_NOT_FOUND },
            { status: 401 }
          )
        }

        if (existingInvite.revoked) {
          config.logger.warn('[AcceptHandler] Invite revoked', { slug })
          return NextResponse.json(
            { success: false, error: ERROR_MESSAGE.INVITE_REVOKED },
            { status: 401 }
          )
        }

        if (existingInvite.expires_at < new Date()) {
          config.logger.warn('[AcceptHandler] Invite expired', { slug })
          return NextResponse.json(
            { success: false, error: ERROR_MESSAGE.INVITE_EXPIRED },
            { status: 401 }
          )
        }

        if (existingInvite.current_uses >= existingInvite.max_uses) {
          config.logger.warn('[AcceptHandler] Invite usage limit reached', {
            slug,
            currentUses: existingInvite.current_uses,
            maxUses: existingInvite.max_uses
          })
          return NextResponse.json(
            { success: false, error: ERROR_MESSAGE.INVITE_ALREADY_USED },
            { status: 401 }
          )
        }

        config.logger.warn('[AcceptHandler] Invite consumption failed', { slug })
        return NextResponse.json(
          { success: false, error: ERROR_MESSAGE.INVALID_TOKEN },
          { status: 401 }
        )
      }

      let user: User
      let organization: Organization
      let isNewUser = false

      const existingUser = await config.database.users.findByEmailGlobal(invite.email)

      if (existingUser) {
        user = existingUser
        const existingOrg = await config.database.organizations.findById(user.org_id)

        if (!existingOrg) {
          throw new Error('Organization not found for existing user')
        }

        organization = existingOrg

        config.logger.info('[AcceptHandler] Existing user logging in via invite', {
          userId: user.user_id,
          email: user.email,
          orgId: organization.org_id,
          inviteUses: `${invite.current_uses + 1}/${invite.max_uses}`
        })
      } else {
        const result = await auth.onboarding.createOrgWithOnboarding(
          invite.email,
          ONBOARDING_TYPE.MAGIC_LINK,
          invite.first_name || undefined,
          invite.last_name || undefined
        )

        user = result.user
        organization = result.organization
        isNewUser = true
      }

      await auth.events.emit({
        type: EVENT_TYPE.INVITE_ACCEPTED,
        data: { inviteId: invite.invite_id, userId: user.user_id }
      })

      if (isNewUser) {
        await auth.events.emit({
          type: EVENT_TYPE.USER_CREATED,
          data: { userId: user.user_id, email: user.email, orgId: organization.org_id }
        })
      }

      if (config.callbacks?.onInviteAccepted) {
        await config.callbacks.onInviteAccepted(invite)
      }

      const ua = request.headers.get('user-agent') || ''
      const sessionToken = createSessionToken(ip, ua, organization.org_id, user.user_id, user.role_id, user.display_name)

      const response = NextResponse.json({ success: true })
      response.cookies.set(COOKIE_NAME.SESSION, sessionToken, {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: config.sessionExpiryHours * 60 * 60
      })

      return response

    } catch (error) {
      config.logger.error('[AcceptHandler] Error', { error: error instanceof Error ? error.message : 'unknown' })
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGE.REQUEST_FAILED },
        { status: 500 }
      )
    }
  }

  async function handleLogout(request: NextRequest): Promise<NextResponse> {
    const response = NextResponse.json({ success: true })
    response.cookies.delete(COOKIE_NAME.SESSION)

    config.logger.info('[AcceptHandler] User logged out')

    return response
  }

  return {
    accept: handleAccept,
    logout: handleLogout
  }
}
