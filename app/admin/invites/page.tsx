import { redirect } from 'next/navigation'
import { InvitesAdmin } from '@/components/admin/invites-admin'
import { getServerSession } from '@/lib/server/session-auth'
import { ROLE } from '@/lib/utils/constants'

export default async function InvitesPage() {
  const session = await getServerSession()

  // Redirect non-admin users to home
  // if (!session || session.roleId !== ROLE.ADMIN) {
  //   redirect('/')
  // }

  return <InvitesAdmin />
}
