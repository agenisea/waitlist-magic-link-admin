import { NextResponse } from 'next/server'
import type { RoleId } from '@/lib/utils/constants'
import { hasPermission } from './roles'

export interface AuthenticatedUser {
  userId: string
  email: string
  orgId: string
  roleId: RoleId
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PermissionError'
  }
}

export function requireRole(requiredRoleId: RoleId, user: AuthenticatedUser | null): void {
  if (!user) {
    throw new PermissionError('Unauthorized')
  }

  if (!hasPermission(user.roleId, requiredRoleId)) {
    throw new PermissionError('Forbidden')
  }
}

export function createUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  )
}

export function createForbiddenResponse(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Forbidden' },
    { status: 403 }
  )
}
