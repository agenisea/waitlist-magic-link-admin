import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken } from '@/lib/server/session-auth'
import { COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/utils/constants'

/**
 * Development-only endpoint to create a test session
 * This bypasses magic link authentication for local testing
 *
 * POST /api/dev/login
 * Body: { orgId?: number, userId?: number, roleId?: number, displayName?: string }
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Not available in production' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))

    // Default test values
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
    const ua = request.headers.get('user-agent') || 'dev-session'
    const orgId = body.orgId || process.env.DEFAULT_ORG_ID
    const userId = body.userId || process.env.DEFAULT_ORG_USER_ID
    const roleId = body.roleId || 1 // Admin role
    const displayName = body.displayName || 'Dev Admin'

    // Create session token
    const sessionToken = createSessionToken(ip, ua, orgId, userId, roleId, displayName)

    const response = NextResponse.json({
      success: true,
      message: 'Dev session created',
      user: { orgId, userId, roleId, displayName }
    })

    // Set session cookie
    response.cookies.set(COOKIE_NAME.SESSION, sessionToken, SESSION_COOKIE_OPTIONS)

    return response

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create dev session' },
      { status: 500 }
    )
  }
}
