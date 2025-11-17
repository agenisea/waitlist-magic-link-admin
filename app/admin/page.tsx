import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/server/session-auth'
import { ROLE } from '@/lib/utils/constants'

export default async function AdminPage() {
  const session = await getServerSession()

  // Redirect non-admin users to home
  // if (!session || session.roleId !== ROLE.ADMIN) {
  //   redirect('/')
  // }

  redirect('/admin/waitlist')
}
