import { ROLE, type RoleId } from '@/lib/utils/constants'

export { ROLE }

export function hasPermission(userRoleId: RoleId, requiredRoleId: RoleId): boolean {
  // Lower number = higher privilege (ADMIN=1, USER=2)
  return userRoleId <= requiredRoleId
}

export function canCreateInvites(roleId: RoleId): boolean {
  return roleId === ROLE.ADMIN
}

export function canApproveWaitlist(roleId: RoleId): boolean {
  return roleId === ROLE.ADMIN
}

export function canViewWaitlist(roleId: RoleId): boolean {
  // Both ADMIN and USER can view waitlist
  return roleId === ROLE.ADMIN || roleId === ROLE.USER
}

export function canRevokeInvites(roleId: RoleId): boolean {
  return roleId === ROLE.ADMIN
}
