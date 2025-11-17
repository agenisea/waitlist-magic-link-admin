import { redirect } from 'next/navigation'
import { WaitlistAdmin } from '@/components/admin/waitlist-admin'
import { getServerSession } from '@/lib/server/session-auth'
import { ROLE } from '@/lib/utils/constants'

export default async function WaitlistPage() {
  const session = await getServerSession()

  // Redirect non-admin users to home
  // if (!session || session.roleId !== ROLE.ADMIN) {
  //   redirect('/')
  // }

  return <WaitlistAdmin />
}
