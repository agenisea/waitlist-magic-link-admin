'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface LogoutConfirmationProps {
  onLogout: () => void | Promise<void>
  variant?: 'button' | 'menu-item'
}

export function LogoutConfirmation({ onLogout, variant = 'button' }: LogoutConfirmationProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {variant === 'button' ? (
          <Button
            variant="ghost"
            size="sm"
            aria-label="Log out"
            className="transition-colors active:bg-slate-100 dark:active:bg-slate-800"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Log out</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="w-full touch-target justify-start transition-colors active:bg-slate-100 dark:active:bg-slate-800 text-sm landscape:text-xs"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4 landscape:w-3 landscape:h-3" aria-hidden="true" />
            <span>Log out</span>
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent showCloseButton={true}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm sm:text-lg landscape:text-sm">Log out?</AlertDialogTitle>
          <AlertDialogDescription className="text-xs sm:text-base landscape:text-xs">
            Before you leave, please confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6">
          <AlertDialogAction
            onClick={onLogout}
            autoFocus={false}
            className="bg-primary text-primary-foreground hover:bg-primary/90 active:!bg-slate-500 dark:active:!bg-slate-600 focus:ring-primary text-xs sm:text-base landscape:text-xs"
          >
            Log out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
