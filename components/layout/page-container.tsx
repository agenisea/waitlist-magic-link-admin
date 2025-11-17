import { ReactNode } from 'react'
import { AppHeader } from '@/components/ui/app-header'

interface PageContainerProps {
  children: ReactNode
  showHeader?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

export function PageContainer({
  children,
  showHeader = true,
  maxWidth = 'full'
}: PageContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full'
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-br from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
      {showHeader && <AppHeader />}
      <main className="flex-1 w-full overflow-y-auto">
        <div className={`${maxWidthClasses[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8`}>
          {children}
        </div>
      </main>
    </div>
  )
}
