import { NextRequest, NextResponse } from 'next/server'
import { WaitlistManager } from '@/lib/waitlist/manager'
import { createSupabaseAdapter } from '@/lib/db/supabase-adapter'
import { validateOrigin, getAllowedOrigins } from '@/lib/security/csrf'
import { sb } from '@/lib/db/client'
import { sendWaitlistConfirmation } from '@/lib/server/email'
import { isValidEmail } from '@/lib/utils/validation'
import type { CreateWaitlistData } from '@/lib/types'

let waitlistManager: WaitlistManager | null = null

function initializeWaitlistManager() {
  if (waitlistManager) return waitlistManager

  const adapter = createSupabaseAdapter(sb)

  const config = {
    database: adapter,
    logger: console,
    callbacks: {
      onWaitlistJoin: async (entry: any) => {
        // Send confirmation email in background
        sendWaitlistConfirmation({
          email: entry.email,
          firstName: entry.first_name || undefined,
          lastName: entry.last_name || undefined,
        }).catch((error: unknown) => {
          console.error('[Waitlist API] Background email failed:', error)
        })
      }
    }
  }

  waitlistManager = new WaitlistManager(config)

  return waitlistManager
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const manager = initializeWaitlistManager()

  // CSRF validation
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const embedOrigins = process.env.ALLOWED_EMBED_ORIGINS?.split(',') || []
  const allowedOrigins = getAllowedOrigins(appUrl, embedOrigins)
  const originCheck = validateOrigin(request, allowedOrigins)

  if (!originCheck.allowed) {
    console.warn('[Waitlist API] Origin validation failed', { origin: originCheck.origin })
    return NextResponse.json(
      { success: false, error: 'Request forbidden' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      console.warn('[Waitlist API] Missing email')
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      console.warn('[Waitlist API] Invalid email format', { email })
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

    const entry = await manager.submitEntry(data)

    console.log('[Waitlist API] Entry created', {
      waitlistId: entry.waitlist_id,
      email: entry.email
    })

    return NextResponse.json({ success: true, waitlistId: entry.waitlist_id })

  } catch (error) {
    if (error instanceof Error && error.message.includes('already registered')) {
      console.warn('[Waitlist API] Duplicate email', { error: error.message })
      return NextResponse.json(
        { success: false, error: 'Request failed' },
        { status: 409 }
      )
    }

    console.error('[Waitlist API] Error', {
      error: error instanceof Error ? error.message : 'unknown'
    })

    return NextResponse.json(
      { success: false, error: 'Request failed' },
      { status: 500 }
    )
  }
}
