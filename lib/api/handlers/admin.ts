import { NextRequest, NextResponse } from 'next/server'
import type { MagicLinkAuth } from '@/lib/admin/magic-link-auth'
import type { AuthenticatedUser } from '@/lib/rbac/permissions'
import { requireRole, createUnauthorizedResponse, createForbiddenResponse, PermissionError } from '@/lib/rbac/permissions'
import { ROLE } from '@/lib/rbac/roles'
import { validateOrigin, getAllowedOrigins } from '@/lib/security/csrf'
import { verifySessionToken } from '@/lib/server/session-auth'
import { COOKIE_NAME, EVENT_TYPE } from '@/lib/admin/constants'

export function createAdminHandlers(auth: MagicLinkAuth) {
  const config = auth.getConfig()

  async function getUserFromRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
    const sessionCookie = request.cookies.get(COOKIE_NAME.SESSION)

    if (!sessionCookie?.value) {
      config.logger.warn('[AdminHandler] No session cookie found')
      return null
    }

    const payload = verifySessionToken(sessionCookie.value)

    if (!payload) {
      config.logger.warn('[AdminHandler] Invalid or expired session token')
      return null
    }

    try {
      const user = await config.database.users.findById(payload.userId)

      if (!user) {
        config.logger.warn('[AdminHandler] User not found', { userId: payload.userId })
        return null
      }

      return {
        email: user.email,
        roleId: user.role_id,
        userId: user.user_id,
        orgId: user.org_id
      }
    } catch (error) {
      config.logger.error('[AdminHandler] Error fetching user', {
        error: error instanceof Error ? error.message : 'unknown'
      })
      return null
    }
  }

  async function handleCreateInvite(request: NextRequest): Promise<NextResponse> {
    const allowedOrigins = getAllowedOrigins(config.appUrl, config.allowedEmbedOrigins)
    const originCheck = validateOrigin(request, allowedOrigins)

    if (!originCheck.allowed) {
      config.logger.warn('[AdminHandler] Origin validation failed', { origin: originCheck.origin })
      return NextResponse.json(
        { success: false, error: 'Request forbidden' },
        { status: 403 }
      )
    }

    const user = await getUserFromRequest(request)

    if (!user) {
      return createUnauthorizedResponse()
    }

    try {
      requireRole(ROLE.ADMIN, user)
    } catch (error) {
      if (error instanceof PermissionError) {
        return createForbiddenResponse()
      }
      throw error
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimit = auth.rateLimiter.check(ip, 'admin')

    if (!rateLimit.allowed) {
      config.logger.warn('[AdminHandler] Rate limit exceeded', { ip })
      return NextResponse.json(
        { success: false, error: 'Request forbidden' },
        { status: 429, headers: rateLimit.headers }
      )
    }

    try {
      const body = await request.json()
      const { email, firstName, lastName, expiresInMinutes, maxUses, purpose } = body

      if (!email) {
        config.logger.warn('[AdminHandler] Missing email in create invite request')
        return NextResponse.json(
          { success: false, error: 'Invalid request' },
          { status: 400 }
        )
      }

      const invite = await auth.invites.createInvite({
        email,
        firstName,
        lastName,
        expiresInMinutes,
        maxUses,
        purpose,
        sentByUserId: user.userId,
        request
      })

      await auth.events.emit({
        type: EVENT_TYPE.INVITE_CREATED,
        data: { inviteId: invite.inviteId, email }
      })

      return NextResponse.json({
        success: true,
        invite: {
          inviteId: invite.inviteId,
          slug: invite.slug,
          magicLink: invite.magicLink,
          expiresAt: invite.expiresAt,
          expiresInMinutes: invite.expiresInMinutes,
          maxUses: invite.maxUses
        }
      })

    } catch (error) {
      config.logger.error('[AdminHandler] Error creating invite', {
        error: error instanceof Error ? error.message : 'unknown'
      })
      return NextResponse.json(
        { success: false, error: 'Request failed' },
        { status: 500 }
      )
    }
  }

  async function handleRevokeInvite(request: NextRequest): Promise<NextResponse> {
    const allowedOrigins = getAllowedOrigins(config.appUrl, config.allowedEmbedOrigins)
    const originCheck = validateOrigin(request, allowedOrigins)

    if (!originCheck.allowed) {
      config.logger.warn('[AdminHandler] Origin validation failed', { origin: originCheck.origin })
      return NextResponse.json(
        { success: false, error: 'Request forbidden' },
        { status: 403 }
      )
    }

    const user = await getUserFromRequest(request)

    if (!user) {
      return createUnauthorizedResponse()
    }

    try {
      requireRole(ROLE.ADMIN, user)
    } catch (error) {
      if (error instanceof PermissionError) {
        return createForbiddenResponse()
      }
      throw error
    }

    try {
      const body = await request.json()
      const { inviteId } = body

      if (!inviteId) {
        config.logger.warn('[AdminHandler] Missing inviteId in revoke request')
        return NextResponse.json(
          { success: false, error: 'Invalid request' },
          { status: 400 }
        )
      }

      await auth.invites.revokeInvite(inviteId)

      await auth.events.emit({
        type: EVENT_TYPE.INVITE_REVOKED,
        data: { inviteId }
      })

      return NextResponse.json({ success: true })

    } catch (error) {
      config.logger.error('[AdminHandler] Error revoking invite', {
        error: error instanceof Error ? error.message : 'unknown'
      })
      return NextResponse.json(
        { success: false, error: 'Request failed' },
        { status: 500 }
      )
    }
  }

  async function handleListInvites(request: NextRequest): Promise<NextResponse> {
    const user = await getUserFromRequest(request)

    if (!user) {
      return createUnauthorizedResponse()
    }

    try {
      requireRole(ROLE.ADMIN, user)
    } catch (error) {
      if (error instanceof PermissionError) {
        return createForbiddenResponse()
      }
      throw error
    }

    try {
      const { searchParams } = new URL(request.url)
      const status = searchParams.get('status') as any

      const invites = await auth.invites.listInvites({ status })

      return NextResponse.json({
        success: true,
        invites: invites.map(invite => ({
          inviteId: invite.invite_id,
          email: invite.email,
          slug: invite.url_slug,
          status: auth.invites.getInviteStatus(invite),
          expiresAt: invite.expires_at,
          maxUses: invite.max_uses,
          currentUses: invite.current_uses,
          purpose: invite.purpose,
          createdAt: invite.created_at,
          usedAt: invite.used_at
        }))
      })

    } catch (error) {
      config.logger.error('[AdminHandler] Error listing invites', {
        error: error instanceof Error ? error.message : 'unknown'
      })
      return NextResponse.json(
        { success: false, error: 'Request failed' },
        { status: 500 }
      )
    }
  }

  async function handleListWaitlist(request: NextRequest): Promise<NextResponse> {
    const user = await getUserFromRequest(request)

    if (!user) {
      return createUnauthorizedResponse()
    }

    try {
      requireRole(ROLE.ADMIN, user)
    } catch (error) {
      if (error instanceof PermissionError) {
        return createForbiddenResponse()
      }
      throw error
    }

    try {
      const { searchParams } = new URL(request.url)
      const status = searchParams.get('status') as any

      const entries = await auth.waitlist.listEntries({ status })

      return NextResponse.json({
        success: true,
        entries: entries.map(entry => ({
          waitlistId: entry.waitlist_id,
          firstName: entry.first_name,
          lastName: entry.last_name,
          email: entry.email,
          organizationName: entry.organization_name,
          jobTitle: entry.job_title,
          interestReason: entry.interest_reason,
          useCase: entry.use_case,
          feedbackImportance: entry.feedback_importance,
          status: entry.status,
          inviteId: entry.invite_id,
          createdAt: entry.created_at
        }))
      })

    } catch (error) {
      config.logger.error('[AdminHandler] Error listing waitlist', {
        error: error instanceof Error ? error.message : 'unknown'
      })
      return NextResponse.json(
        { success: false, error: 'Request failed' },
        { status: 500 }
      )
    }
  }

  async function handleApproveWaitlist(request: NextRequest): Promise<NextResponse> {
    const allowedOrigins = getAllowedOrigins(config.appUrl, config.allowedEmbedOrigins)
    const originCheck = validateOrigin(request, allowedOrigins)

    if (!originCheck.allowed) {
      config.logger.warn('[AdminHandler] Origin validation failed', { origin: originCheck.origin })
      return NextResponse.json(
        { success: false, error: 'Request forbidden' },
        { status: 403 }
      )
    }

    const user = await getUserFromRequest(request)

    if (!user) {
      return createUnauthorizedResponse()
    }

    try {
      requireRole(ROLE.ADMIN, user)
    } catch (error) {
      if (error instanceof PermissionError) {
        return createForbiddenResponse()
      }
      throw error
    }

    try {
      const body = await request.json()
      const { waitlistId } = body

      if (!waitlistId) {
        config.logger.warn('[AdminHandler] Missing waitlistId in approve request')
        return NextResponse.json(
          { success: false, error: 'Invalid request' },
          { status: 400 }
        )
      }

      const entries = await auth.waitlist.listEntries()
      const entry = entries.find(e => e.waitlist_id === waitlistId)

      if (!entry) {
        config.logger.warn('[AdminHandler] Waitlist entry not found', { waitlistId })
        return NextResponse.json(
          { success: false, error: 'Not found' },
          { status: 404 }
        )
      }

      const invite = await auth.invites.createInvite({
        email: entry.email,
        firstName: entry.first_name || undefined,
        lastName: entry.last_name || undefined,
        expiresInMinutes: config.authLinkExpiryMinutes,
        purpose: 'waitlist_approval',
        sentByUserId: user.userId,
        request
      })

      await auth.waitlist.approveEntry(waitlistId, invite.inviteId)

      await auth.events.emit({
        type: EVENT_TYPE.WAITLIST_APPROVED,
        data: { waitlistId, inviteId: invite.inviteId }
      })

      return NextResponse.json({
        success: true,
        inviteId: invite.inviteId,
        magicLink: invite.magicLink,
        expiresInMinutes: invite.expiresInMinutes,
        maxUses: invite.maxUses
      })

    } catch (error) {
      config.logger.error('[AdminHandler] Error approving waitlist', {
        error: error instanceof Error ? error.message : 'unknown'
      })
      return NextResponse.json(
        { success: false, error: 'Request failed' },
        { status: 500 }
      )
    }
  }

  async function handleRejectWaitlist(request: NextRequest): Promise<NextResponse> {
    const allowedOrigins = getAllowedOrigins(config.appUrl, config.allowedEmbedOrigins)
    const originCheck = validateOrigin(request, allowedOrigins)

    if (!originCheck.allowed) {
      config.logger.warn('[AdminHandler] Origin validation failed', { origin: originCheck.origin })
      return NextResponse.json(
        { success: false, error: 'Request forbidden' },
        { status: 403 }
      )
    }

    const user = await getUserFromRequest(request)

    if (!user) {
      return createUnauthorizedResponse()
    }

    try {
      requireRole(ROLE.ADMIN, user)
    } catch (error) {
      if (error instanceof PermissionError) {
        return createForbiddenResponse()
      }
      throw error
    }

    try {
      const body = await request.json()
      const { waitlistId } = body

      if (!waitlistId) {
        config.logger.warn('[AdminHandler] Missing waitlistId in reject request')
        return NextResponse.json(
          { success: false, error: 'Invalid request' },
          { status: 400 }
        )
      }

      await auth.waitlist.rejectEntry(waitlistId)

      await auth.events.emit({
        type: EVENT_TYPE.WAITLIST_REJECTED,
        data: { waitlistId }
      })

      return NextResponse.json({ success: true })

    } catch (error) {
      config.logger.error('[AdminHandler] Error rejecting waitlist', {
        error: error instanceof Error ? error.message : 'unknown'
      })
      return NextResponse.json(
        { success: false, error: 'Request failed' },
        { status: 500 }
      )
    }
  }

  async function handleResendInvite(request: NextRequest): Promise<NextResponse> {
    const allowedOrigins = getAllowedOrigins(config.appUrl, config.allowedEmbedOrigins)
    const originCheck = validateOrigin(request, allowedOrigins)

    if (!originCheck.allowed) {
      config.logger.warn('[AdminHandler] Origin validation failed', { origin: originCheck.origin })
      return NextResponse.json(
        { success: false, error: 'Request forbidden' },
        { status: 403 }
      )
    }

    const user = await getUserFromRequest(request)

    if (!user) {
      return createUnauthorizedResponse()
    }

    try {
      requireRole(ROLE.ADMIN, user)
    } catch (error) {
      if (error instanceof PermissionError) {
        return createForbiddenResponse()
      }
      throw error
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimit = auth.rateLimiter.check(ip, 'admin')

    if (!rateLimit.allowed) {
      config.logger.warn('[AdminHandler] Rate limit exceeded', { ip })
      return NextResponse.json(
        { success: false, error: 'Request forbidden' },
        { status: 429, headers: rateLimit.headers }
      )
    }

    try {
      const body = await request.json()
      const { email } = body

      if (!email) {
        config.logger.warn('[AdminHandler] Missing email in resend invite request')
        return NextResponse.json(
          { success: false, error: 'Invalid request' },
          { status: 400 }
        )
      }

      // Find all invites for this email (including revoked ones to get name info)
      const allInvites = await auth.invites.listInvites()
      const emailInvites = allInvites.filter(
        invite => invite.email.toLowerCase() === email.toLowerCase()
      )

      // Extract name from most recent invite
      const firstName = emailInvites[0]?.first_name || undefined
      const lastName = emailInvites[0]?.last_name || undefined

      // Revoke all non-revoked invites for this email
      const activeInvites = emailInvites.filter(inv => !inv.revoked)
      for (const invite of activeInvites) {
        await auth.invites.revokeInvite(invite.invite_id)
        config.logger.info('[AdminHandler] Revoked existing invite', { inviteId: invite.invite_id, email })
      }

      // Create new invite with name from existing invite
      const invite = await auth.invites.createInvite({
        email,
        firstName,
        lastName,
        expiresInMinutes: config.authLinkExpiryMinutes,
        purpose: 'resend',
        sentByUserId: user.userId,
        request
      })

      await auth.events.emit({
        type: EVENT_TYPE.INVITE_CREATED,
        data: { inviteId: invite.inviteId, email }
      })

      config.logger.info('[AdminHandler] Invite resent', {
        email,
        revokedCount: emailInvites.length,
        newInviteId: invite.inviteId
      })

      return NextResponse.json({
        success: true,
        invite: {
          inviteId: invite.inviteId,
          slug: invite.slug,
          magicLink: invite.magicLink,
          expiresAt: invite.expiresAt,
          expiresInMinutes: invite.expiresInMinutes,
          maxUses: invite.maxUses
        },
        revokedCount: emailInvites.length
      })

    } catch (error) {
      config.logger.error('[AdminHandler] Error resending invite', {
        error: error instanceof Error ? error.message : 'unknown'
      })
      return NextResponse.json(
        { success: false, error: 'Request failed' },
        { status: 500 }
      )
    }
  }

  return {
    createInvite: handleCreateInvite,
    revokeInvite: handleRevokeInvite,
    resendInvite: handleResendInvite,
    listInvites: handleListInvites,
    listWaitlist: handleListWaitlist,
    approveWaitlist: handleApproveWaitlist,
    rejectWaitlist: handleRejectWaitlist
  }
}
