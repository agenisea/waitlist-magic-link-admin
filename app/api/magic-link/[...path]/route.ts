import { NextRequest, NextResponse } from 'next/server'
import { createMagicLinkAuth, type MagicLinkAuth } from '@/lib/admin/magic-link-auth'
import { createSupabaseAdapter } from '@/lib/db/supabase-adapter'
import { createAcceptHandlers } from '@/lib/api/handlers/accept'
import { createWaitlistHandlers } from '@/lib/api/handlers/waitlist'
import { createAdminHandlers } from '@/lib/api/handlers/admin'
import { sb } from '@/lib/db/client'
import { sendWaitlistConfirmation, sendMagicLinkInvite } from '@/lib/server/email'

let magicLinkAuth: MagicLinkAuth | null = null
let acceptHandlers: ReturnType<typeof createAcceptHandlers> | null = null
let waitlistHandlers: ReturnType<typeof createWaitlistHandlers> | null = null
let adminHandlers: ReturnType<typeof createAdminHandlers> | null = null

function initializeMagicLinkAuth() {
  if (magicLinkAuth) return

  if (!process.env.TOKEN_PEPPER) {
    throw new Error('TOKEN_PEPPER environment variable is required')
  }

  if (!process.env.JWT_PRIVATE_KEY || !process.env.JWT_PUBLIC_KEY) {
    throw new Error('JWT_PRIVATE_KEY and JWT_PUBLIC_KEY environment variables are required')
  }

  magicLinkAuth = createMagicLinkAuth({
    database: createSupabaseAdapter(sb),
    tokenPepper: process.env.TOKEN_PEPPER,
    jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
    jwtPublicKey: process.env.JWT_PUBLIC_KEY,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    allowedEmbedOrigins: process.env.ALLOWED_EMBED_ORIGINS?.split(',') || [],
    authLinkExpiryMinutes: 1440, // 24 hours
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
    callbacks: {
      onUserCreated: async (user) => {
        console.log('[MagicLink] New user created:', user.email)
      },
      onInviteCreated: async (data) => {
        console.log('[MagicLink] Invite created:', data.invite.email)

        // Send magic link email in background (fire-and-forget)
        sendMagicLinkInvite({
          email: data.invite.email,
          firstName: data.invite.first_name || undefined,
          magicLink: data.magicLink,
          expiresInMinutes: data.expiresInMinutes,
        }).catch((error) => {
          // Log error but don't block the response
          console.error('[MagicLink] Background email failed:', error)
        })
      },
      onInviteAccepted: async (invite) => {
        console.log('[MagicLink] Invite accepted:', invite.email)
      },
      onWaitlistJoin: async (entry) => {
        console.log('[MagicLink] Waitlist entry:', entry.email)

        // Send confirmation email in background (fire-and-forget)
        sendWaitlistConfirmation({
          email: entry.email,
          firstName: entry.first_name || undefined,
          lastName: entry.last_name || undefined,
        }).catch((error) => {
          // Log error but don't block the response
          console.error('[MagicLink] Background email failed:', error)
        })
      }
    },
    logger: console
  })

  acceptHandlers = createAcceptHandlers(magicLinkAuth)
  waitlistHandlers = createWaitlistHandlers(magicLinkAuth)
  adminHandlers = createAdminHandlers(magicLinkAuth)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    initializeMagicLinkAuth()
  } catch (error) {
    console.error('[MagicLink API] Initialization failed:', error)
    return NextResponse.json(
      { error: 'Service configuration error' },
      { status: 503 }
    )
  }

  if (!acceptHandlers || !waitlistHandlers || !adminHandlers) {
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503 }
    )
  }

  const { path: pathSegments } = await params
  const path = pathSegments.join('/')

  try {
    if (path === 'auth/accept') {
      return await acceptHandlers.accept(request)
    }

    if (path === 'auth/logout') {
      return await acceptHandlers.logout(request)
    }

    if (path === 'waitlist/join') {
      return await waitlistHandlers.join(request)
    }

    if (path === 'admin/invites/create') {
      return await adminHandlers.createInvite(request)
    }

    if (path === 'admin/invites/revoke') {
      return await adminHandlers.revokeInvite(request)
    }

    if (path === 'admin/invites/resend') {
      return await adminHandlers.resendInvite(request)
    }

    if (path === 'admin/waitlist/approve') {
      return await adminHandlers.approveWaitlist(request)
    }

    if (path === 'admin/waitlist/reject') {
      return await adminHandlers.rejectWaitlist(request)
    }

    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    )
  } catch (error) {
    console.error('[MagicLink API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    initializeMagicLinkAuth()
  } catch (error) {
    console.error('[MagicLink API] Initialization failed:', error)
    return NextResponse.json(
      { error: 'Service configuration error' },
      { status: 503 }
    )
  }

  if (!acceptHandlers || !waitlistHandlers || !adminHandlers) {
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503 }
    )
  }

  const { path: pathSegments } = await params
  const path = pathSegments.join('/')

  try {
    if (path === 'admin/invites/list') {
      return await adminHandlers.listInvites(request)
    }

    if (path === 'admin/waitlist/list') {
      return await adminHandlers.listWaitlist(request)
    }

    if (path === 'auth/accept') {
      return NextResponse.json(
        { error: 'Method not allowed. Use POST.' },
        { status: 405 }
      )
    }

    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    )
  } catch (error) {
    console.error('[MagicLink API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
