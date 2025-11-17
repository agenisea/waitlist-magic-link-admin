'use client'

import { useEffect } from 'react'

/**
 * Development-only provider that automatically creates a test session on app startup
 * This eliminates the need to manually authenticate during local development
 */
export function DevSessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV === 'production') {
      return
    }

    // Create dev session on mount
    fetch('/api/dev/login', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('[DevSession] Auto-login successful:', data.user)
        }
      })
      .catch(err => {
        console.warn('[DevSession] Auto-login failed:', err)
      })
  }, [])

  return <>{children}</>
}
