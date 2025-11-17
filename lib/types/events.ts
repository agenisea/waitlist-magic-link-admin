import type { User, Invite, WaitlistEntry } from './index'

export type MagicLinkEvent =
  | { type: 'user.created', data: { userId: string, email: string, orgId: string } }
  | { type: 'invite.created', data: { inviteId: string, email: string } }
  | { type: 'invite.accepted', data: { inviteId: string, userId: string } }
  | { type: 'invite.revoked', data: { inviteId: string } }
  | { type: 'invite.expired', data: { inviteId: string } }
  | { type: 'waitlist.joined', data: { waitlistId: string, email: string } }
  | { type: 'waitlist.approved', data: { waitlistId: string, inviteId: string } }
  | { type: 'waitlist.rejected', data: { waitlistId: string } }

export type EventHandler<T extends MagicLinkEvent['type']> = (
  data: Extract<MagicLinkEvent, { type: T }>['data']
) => Promise<void> | void
