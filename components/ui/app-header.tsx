'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { LogoutConfirmation } from '@/components/ui/logout-confirmation'
import { useCloseOnOrientationChange } from '@/lib/client/use-close-on-orientation-change'
import { retryFetch } from '@/lib/utils/fetch'
import { ROLE, DEFAULT_MAX_RETRY_ATTEMPTS, DEFAULT_FETCH_RETRY_BASE_DELAY_MS } from '@/lib/utils/constants'
import { useAuthState } from '@/components/providers/auth-provider'

interface AppHeaderProps {
  children?: React.ReactNode
  logoRightContent?: React.ReactNode
  showLogout?: boolean
  showMobileMenu?: boolean
  mobileMenuItems?: React.ReactNode | ((closeMobileMenu: () => void) => React.ReactNode)
  onBeforeLogout?: () => void
}

export function AppHeader({ children, logoRightContent, showLogout = true, showMobileMenu = true, mobileMenuItems, onBeforeLogout }: AppHeaderProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { roleId } = useAuthState()

  useCloseOnOrientationChange(() => setMobileMenuOpen(false))

  const handleLogout = async () => {
    onBeforeLogout?.()

    try {
      await retryFetch(
        '/api/access/logout',
        {
          method: 'POST',
          credentials: 'include',
        },
        {
          maxAttempts: DEFAULT_MAX_RETRY_ATTEMPTS,
          baseDelayMs: DEFAULT_FETCH_RETRY_BASE_DELAY_MS,
        }
      )
    } catch (err) {
      // Logout request failed
    }

    window.location.reload()
  }

  const isAdmin = roleId === ROLE.ADMIN
  const isOnAdminPage = pathname?.startsWith('/admin')

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 landscape:py-1.5 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm min-h-[60px] landscape:min-h-[44px] relative">
      {/* Mobile: Logo + Version */}
      <div className="flex items-center gap-2 sm:hidden landscape:gap-1.5">
        <Image
          src="/logo.webp"
          alt="Logo"
          width={150}
          height={40}
          className="h-7 landscape:h-6 w-auto"
          style={{ width: 'auto' }}
        />
        {process.env.NEXT_PUBLIC_APP_VERSION && (
          <span className="text-[10px] landscape:text-[9px] text-slate-400 dark:text-slate-500">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
        )}
        {logoRightContent}
      </div>

      {/* Desktop: Logo + Version + Navigation */}
      <div className="hidden sm:flex items-center gap-6">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.webp"
            alt="Logo"
            width={180}
            height={48}
            className="h-9 w-auto"
            style={{ width: 'auto' }}
          />
          {process.env.NEXT_PUBLIC_APP_VERSION && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              v{process.env.NEXT_PUBLIC_APP_VERSION}
            </span>
          )}
          {logoRightContent}
        </div>
      </div>

      {/* Desktop & Landscape: Menu Controls */}
      <div className="hidden sm:flex items-center gap-3">
        {children}
        {showMobileMenu && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen(true)}
            className="touch-target transition-colors active:bg-slate-100 dark:active:bg-slate-800"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Mobile Portrait: New Chat + Hamburger */}
      <div className="flex items-center gap-2 sm:hidden">
        {children}
        {showMobileMenu && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen(true)}
            className="touch-target transition-colors active:bg-slate-100 dark:active:bg-slate-800"
          >
            <Menu className="w-5 h-5 landscape:w-4 landscape:h-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Shared Hamburger Menu Sheet - All Form Factors */}
      {showMobileMenu && (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="right" className="w-[280px]">
            <SheetHeader>
              <SheetTitle className="text-left text-lg landscape:text-base">Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Navigation and settings
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-3 overflow-y-auto flex-1">
              {/* Mobile Menu Items */}
              {mobileMenuItems && (
                <div className="flex flex-col gap-3">
                  {typeof mobileMenuItems === 'function'
                    ? mobileMenuItems(() => setMobileMenuOpen(false))
                    : mobileMenuItems}
                </div>
              )}

              {/* Admin Link - Only show if admin AND not already on admin pages */}
              {isAdmin && !isOnAdminPage && (
                <>
                  <div className="border-t border-slate-200 dark:border-slate-700" />
                  <Link href="/admin/waitlist" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full touch-target justify-start transition-colors active:bg-slate-100 dark:active:bg-slate-800 text-sm landscape:text-xs"
                      aria-label="Admin Dashboard"
                    >
                      <span>Admin</span>
                    </Button>
                  </Link>
                </>
              )}

              {/* Logout - All form factors */}
              {showLogout && (
                <>
                  <div className="border-t border-slate-200 dark:border-slate-700" />
                  <LogoutConfirmation onLogout={handleLogout} variant="menu-item" />
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </header>
  )
}
