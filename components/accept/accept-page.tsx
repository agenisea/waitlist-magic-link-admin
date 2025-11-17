'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { retryFetch } from '@/lib/utils/fetch'
import { DEFAULT_MAX_RETRY_ATTEMPTS, DEFAULT_FETCH_RETRY_BASE_DELAY_MS } from '@/lib/utils/constants'
import { API_BASE_PATH, API_ENDPOINTS, ERROR_MESSAGE } from '@/lib/admin/constants'

const RETRY_OPTIONS = { maxAttempts: DEFAULT_MAX_RETRY_ATTEMPTS, baseDelayMs: DEFAULT_FETCH_RETRY_BASE_DELAY_MS }

interface AcceptPageProps {
  slug: string
  apiBasePath?: string
  redirectPath?: string
}

type Status = 'loading' | 'success' | 'error'

interface ErrorDetails {
  message: string
  code?: string
}

export function AcceptPage({
  slug,
  apiBasePath = API_BASE_PATH,
  redirectPath = '/'
}: AcceptPageProps) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<ErrorDetails | null>(null)

  useEffect(() => {
    async function acceptInvite() {
      try {
        const hash = window.location.hash
        const token = hash.replace(/^#t=/, '')

        if (!token) {
          setStatus('error')
          setError({
            message: ERROR_MESSAGE.INVALID_TOKEN,
            code: 'MISSING_TOKEN'
          })
          return
        }

        window.history.replaceState(null, '', `/magic-link/accept/${slug}`)

        const response = await retryFetch(
          `${apiBasePath}/${API_ENDPOINTS.AUTH_ACCEPT}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, token })
          },
          RETRY_OPTIONS
        )

        const data = await response.json()

        if (response.ok && data.success) {
          setStatus('success')
          setTimeout(() => {
            router.push(redirectPath)
          }, 1000)
        } else {
          setStatus('error')
          setError({
            message: data.error || 'Failed to accept invite',
            code: `HTTP_${response.status}`
          })
        }
      } catch (err) {
        setStatus('error')
        setError({
          message: 'Network error. Please check your connection and try again.',
          code: 'NETWORK_ERROR'
        })
      }
    }

    acceptInvite()
  }, [slug, apiBasePath, redirectPath, router])

  return (
    <div className="max-w-md w-full space-y-4 sm:space-y-6">
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          {status === 'loading' && (
            <>
              <div className="mx-auto h-16 w-16 relative">
                <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-700"></div>
                <div className="absolute inset-0 rounded-full border-4 border-blue-600 dark:border-blue-400 border-t-transparent animate-spin"></div>
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl landscape:text-lg">
                  Verifying your invite
                </CardTitle>
                <CardDescription className="text-sm sm:text-base landscape:text-sm mt-2">
                  Please wait while we set up your account...
                </CardDescription>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg
                  className="h-10 w-10 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl landscape:text-lg">
                  Success!
                </CardTitle>
                <CardDescription className="text-sm sm:text-base landscape:text-sm mt-2">
                  Redirecting to your workspace...
                </CardDescription>
              </div>
            </>
          )}

          {status === 'error' && error && (
            <>
              <div className="mx-auto h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg
                  className="h-10 w-10 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl landscape:text-lg">
                  Invalid Invite
                </CardTitle>
                <CardDescription className="text-sm sm:text-base landscape:text-sm mt-2">
                  {error.message}
                </CardDescription>
              </div>
            </>
          )}
        </CardHeader>

        {status === 'error' && (
          <CardContent>
            <Button
              asChild
              size="lg"
              className="w-full transition-colors active:!bg-slate-500 dark:active:!bg-slate-600 text-sm sm:text-base landscape:text-sm min-h-[48px]"
            >
              <a href="/waitlist">
                Join Waitlist
              </a>
            </Button>
          </CardContent>
        )}
      </Card>

      {status === 'error' && (
        <Card className="shadow-lg border-0 bg-yellow-50/80 dark:bg-yellow-900/10 backdrop-blur-sm border-yellow-200 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-start gap-2 text-base sm:text-lg landscape:text-sm text-yellow-800 dark:text-yellow-200">
              <svg
                className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Common Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
              <li>Magic links expire after 24 hours</li>
              <li>Links can only be used once</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
