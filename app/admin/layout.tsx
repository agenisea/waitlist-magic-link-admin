'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AppHeader } from '@/components/ui/app-header'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
      <AppHeader />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-lg sm:text-xl landscape:text-lg font-bold text-slate-900 dark:text-slate-100">Admin Dashboard</h1>
          </div>

          <nav className="mb-4 sm:mb-6 flex gap-3 sm:gap-4 border-b border-slate-200 dark:border-slate-700 pb-2">
            <Link
              href="/admin/waitlist"
              className={`text-sm sm:text-xs landscape:text-xs font-medium transition-colors ${
                pathname === '/admin/waitlist'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Waitlist
            </Link>
            <Link
              href="/admin/invites"
              className={`text-sm sm:text-xs landscape:text-xs font-medium transition-colors ${
                pathname === '/admin/invites'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Invites
            </Link>
          </nav>

          {children}
        </div>
      </main>
    </div>
  )
}
