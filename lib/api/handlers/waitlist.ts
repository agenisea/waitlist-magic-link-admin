import { NextRequest, NextResponse } from 'next/server'
import type { MagicLinkAuth } from '@/lib/admin/magic-link-auth'
import type { CreateWaitlistData } from '@/lib/types'
import { validateOrigin, getAllowedOrigins } from '@/lib/security/csrf'
import { isValidEmail } from '@/lib/utils/validation'

export function createWaitlistHandlers(auth: MagicLinkAuth) {
  const config = auth.getConfig()

  async function handleJoin(request: NextRequest): Promise<NextResponse> {
    if (!config.features.waitlistEnabled) {
      config.logger.warn('[WaitlistHandler] Waitlist disabled')
      return NextResponse.json(
        { success: false, error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const allowedOrigins = getAllowedOrigins(config.appUrl, config.allowedEmbedOrigins)
    const originCheck = validateOrigin(request, allowedOrigins)

    if (!originCheck.allowed) {
      config.logger.warn('[WaitlistHandler] Origin validation failed', { origin: originCheck.origin })
      return NextResponse.json(
        { success: false, error: 'Request forbidden' },
        { status: 403 }
      )
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    const rateLimit = auth.rateLimiter.check(ip, 'waitlist')

    if (!rateLimit.allowed) {
      config.logger.warn('[WaitlistHandler] Rate limit exceeded', { ip })
      return NextResponse.json(
        { success: false, error: 'Request forbidden' },
        { status: 429, headers: rateLimit.headers }
      )
    }

    try {
      const body = await request.json()

      const { email } = body

      if (!email || typeof email !== 'string') {
        config.logger.warn('[WaitlistHandler] Missing email')
        return NextResponse.json(
          { success: false, error: 'Invalid request' },
          { status: 400 }
        )
      }

      if (!isValidEmail(email)) {
        config.logger.warn('[WaitlistHandler] Invalid email format', { email })
        return NextResponse.json(
          { success: false, error: 'Invalid request' },
          { status: 400 }
        )
      }

      const data: CreateWaitlistData = {
        first_name: body.first_name,
        last_name: body.last_name,
        email: email.trim().toLowerCase(),
        organization_name: body.organization_name,
        job_title: body.job_title,
        interest_reason: body.interest_reason,
        use_case: body.use_case,
        feedback_importance: body.feedback_importance,
        subscribe_newsletter: body.subscribe_newsletter || false
      }

      const entry = await auth.waitlist.submitEntry(data)

      await auth.events.emit({
        type: 'waitlist.joined',
        data: { waitlistId: entry.waitlist_id, email: entry.email }
      })

      config.logger.info('[WaitlistHandler] Entry created', {
        waitlistId: entry.waitlist_id,
        email: entry.email
      })

      return NextResponse.json({ success: true, waitlistId: entry.waitlist_id })

    } catch (error) {
      if (error instanceof Error && error.message.includes('already registered')) {
        config.logger.warn('[WaitlistHandler] Duplicate email', { error: error.message })
        return NextResponse.json(
          { success: false, error: 'Request failed' },
          { status: 409 }
        )
      }

      config.logger.error('[WaitlistHandler] Error', {
        error: error instanceof Error ? error.message : 'unknown'
      })

      return NextResponse.json(
        { success: false, error: 'Request failed' },
        { status: 500 }
      )
    }
  }

  return {
    join: handleJoin
  }
}
