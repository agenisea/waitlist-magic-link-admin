'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { retryFetch } from '@/lib/utils/fetch'
import { DEFAULT_MAX_RETRY_ATTEMPTS, DEFAULT_FETCH_RETRY_BASE_DELAY_MS } from '@/lib/utils/constants'
import { isValidEmail } from '@/lib/utils/validation'

const RETRY_OPTIONS = { maxAttempts: DEFAULT_MAX_RETRY_ATTEMPTS, baseDelayMs: DEFAULT_FETCH_RETRY_BASE_DELAY_MS }

const API_BASE_PATH = '/api'
const API_ENDPOINTS = {
  WAITLIST_JOIN: 'waitlist/join',
} as const

interface WaitlistFormData {
  interestReason: string | null
  useCase: string | null
  feedbackImportance: number
  firstName: string
  lastName: string
  email: string
  organizationName: string
  jobTitle: string
  subscribeNewsletter: boolean
  consentToData: boolean
}

interface WaitlistCarouselProps {
  apiBasePath?: string
  onSuccess?: () => void
  embedded?: boolean
  allowedOrigins?: string[]
}

const TOTAL_CARDS = 4

export function WaitlistCarousel({
  apiBasePath = API_BASE_PATH,
  onSuccess,
  embedded = false,
  allowedOrigins = []
}: WaitlistCarouselProps) {
  const [currentCard, setCurrentCard] = useState(1)
  const [formData, setFormData] = useState<WaitlistFormData>({
    interestReason: null,
    useCase: null,
    feedbackImportance: 5,
    firstName: '',
    lastName: '',
    email: '',
    organizationName: '',
    jobTitle: '',
    subscribeNewsletter: false,
    consentToData: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    if (embedded && typeof window !== 'undefined') {
      notifyParentResize()
    }
  }, [currentCard, embedded])

  function notifyParentResize() {
    if (window.parent !== window) {
      const height = document.body.scrollHeight

      if (allowedOrigins.length > 0) {
        // Post to all allowed origins
        allowedOrigins.forEach(origin => {
          window.parent.postMessage(
            { type: 'resize', height },
            origin
          )
        })
      } else {
        // Fallback to wildcard if no origins specified
        window.parent.postMessage(
          { type: 'resize', height },
          '*'
        )
      }
    }
  }

  function handleNext() {
    if (currentCard < TOTAL_CARDS) {
      if (validateCurrentCard()) {
        setIsTransitioning(true)
        setTimeout(() => {
          setCurrentCard(prev => prev + 1)
          window.scrollTo({ top: 0, behavior: 'smooth' })
          setTimeout(() => setIsTransitioning(false), 50)
        }, 300)
      }
    }
  }

  function handleBack() {
    if (currentCard > 1) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentCard(prev => prev - 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setTimeout(() => setIsTransitioning(false), 50)
      }, 300)
    }
  }

  function validateCurrentCard(): boolean {
    const newErrors: Record<string, string> = {}

    if (currentCard === 1 && !formData.interestReason) {
      newErrors.interestReason = 'Please select an option'
    }

    if (currentCard === 2 && !formData.useCase) {
      newErrors.useCase = 'Please select a use case'
    }

    if (currentCard === 4) {
      if (!formData.email) {
        newErrors.email = 'Email is required'
      } else if (!isValidEmail(formData.email)) {
        newErrors.email = 'Invalid email format'
      }

      if (!formData.consentToData) {
        newErrors.consentToData = 'You must agree to data processing'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit() {
    if (!validateCurrentCard()) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await retryFetch(
        `${apiBasePath}/${API_ENDPOINTS.WAITLIST_JOIN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: formData.firstName || undefined,
            last_name: formData.lastName || undefined,
            email: formData.email.trim().toLowerCase(),
            organization_name: formData.organizationName || undefined,
            job_title: formData.jobTitle || undefined,
            interest_reason: formData.interestReason,
            use_case: formData.useCase,
            feedback_importance: formData.feedbackImportance,
            subscribe_newsletter: formData.subscribeNewsletter
          })
        },
        RETRY_OPTIONS
      )

      const data = await response.json()

      if (response.ok && data.success) {
        if (embedded && window.parent !== window) {
          if (allowedOrigins.length > 0) {
            allowedOrigins.forEach(origin => {
              window.parent.postMessage({ type: 'submit_success' }, origin)
            })
          } else {
            window.parent.postMessage({ type: 'submit_success' }, '*')
          }
        }

        if (onSuccess) {
          onSuccess()
        } else {
          setIsTransitioning(true)
          setTimeout(() => {
            setCurrentCard(TOTAL_CARDS + 1)
            setTimeout(() => setIsTransitioning(false), 50)
          }, 300)
        }
      } else {
        setSubmitError(data.error || 'Failed to submit. Please try again.')
      }
    } catch (error) {
      setSubmitError('Network error. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function renderProgressIndicator() {
    return (
      <div className="flex justify-center gap-2 mb-6">
        {Array.from({ length: TOTAL_CARDS }).map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all ${
              index + 1 === currentCard
                ? 'w-8 bg-blue-600 dark:bg-blue-500'
                : index + 1 < currentCard
                ? 'w-2 bg-blue-600 dark:bg-blue-500'
                : 'w-2 bg-slate-300 dark:bg-slate-600'
            }`}
            aria-label={`Step ${index + 1} of ${TOTAL_CARDS}`}
          />
        ))}
      </div>
    )
  }

  function renderCard() {
    switch (currentCard) {
      case 1:
        return (
          <CardContainer title="What would you like to gain from joining the waitlist?">
            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-3">
              <OptionButton
                selected={formData.interestReason === 'early_access'}
                onClick={() => {
                  setFormData(prev => ({ ...prev, interestReason: 'early_access' }))
                  setErrors(prev => ({ ...prev, interestReason: '' }))
                }}
              >
                Early access invitations
              </OptionButton>
              <OptionButton
                selected={formData.interestReason === 'feature_updates'}
                onClick={() => {
                  setFormData(prev => ({ ...prev, interestReason: 'feature_updates' }))
                  setErrors(prev => ({ ...prev, interestReason: '' }))
                }}
              >
                Updates on new features
              </OptionButton>
              {errors.interestReason && (
                <p className="text-sm text-red-600 mt-2">{errors.interestReason}</p>
              )}

              <div className="flex justify-between mt-6">
                {currentCard > 1 ? (
                  <Button
                    type="button"
                    onClick={handleBack}
                    className="transition-colors active:!bg-slate-500 dark:active:!bg-slate-600"
                  >
                    Back
                  </Button>
                ) : (
                  <div />
                )}
                <Button
                  type="submit"
                  className="ml-auto transition-colors active:!bg-slate-500 dark:active:!bg-slate-600"
                >
                  Next
                </Button>
              </div>
            </form>
          </CardContainer>
        )

      case 2:
        return (
          <CardContainer title="Choose the best match for what you plan to use this app for?">
            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-3">
              {['Workplace', 'Personal Life', 'Other'].map((useCase) => (
                <OptionButton
                  key={useCase}
                  selected={formData.useCase === useCase}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, useCase }))
                    setErrors(prev => ({ ...prev, useCase: '' }))
                  }}
                >
                  {useCase}
                </OptionButton>
              ))}
              {errors.useCase && (
                <p className="text-sm text-red-600 mt-2">{errors.useCase}</p>
              )}

              <div className="flex justify-between mt-6">
                {currentCard > 1 ? (
                  <Button
                    type="button"
                    onClick={handleBack}
                    className="transition-colors active:!bg-slate-500 dark:active:!bg-slate-600"
                  >
                    Back
                  </Button>
                ) : (
                  <div />
                )}
                <Button
                  type="submit"
                  className="ml-auto transition-colors active:!bg-slate-500 dark:active:!bg-slate-600"
                >
                  Next
                </Button>
              </div>
            </form>
          </CardContainer>
        )

      case 3:
        return (
          <CardContainer title="How important is it for you to contribute feedback?">
            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="py-8">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>1</span>
                <span className="text-2xl font-bold text-gray-900">
                  {formData.feedbackImportance}
                </span>
                <span>10</span>
              </div>
              <input
                id="feedback-importance"
                name="feedback_importance"
                type="range"
                min="1"
                max="10"
                value={formData.feedbackImportance}
                onChange={(e) => setFormData(prev => ({ ...prev, feedbackImportance: parseInt(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                aria-label="Feedback importance scale from 1 to 10"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Not important</span>
                <span>Very important</span>
              </div>

              <div className="flex justify-between mt-6">
                {currentCard > 1 ? (
                  <Button
                    type="button"
                    onClick={handleBack}
                    className="transition-colors active:!bg-slate-500 dark:active:!bg-slate-600"
                  >
                    Back
                  </Button>
                ) : (
                  <div />
                )}
                <Button
                  type="submit"
                  className="ml-auto transition-colors active:!bg-slate-500 dark:active:!bg-slate-600"
                >
                  Next
                </Button>
              </div>
            </form>
          </CardContainer>
        )

      case 4:
        return (
          <CardContainer title="Please share your contact details to join the waitlist">
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-3">
              <InputField
                label="First Name"
                optional
                value={formData.firstName}
                onChange={(value) => setFormData(prev => ({ ...prev, firstName: value }))}
                autocomplete="given-name"
              />
              <InputField
                label="Last Name"
                optional
                value={formData.lastName}
                onChange={(value) => setFormData(prev => ({ ...prev, lastName: value }))}
                autocomplete="family-name"
              />
              <InputField
                label="Email"
                type="email"
                required
                value={formData.email}
                onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
                error={errors.email}
                autocomplete="email"
              />
              <InputField
                label="Organization name"
                optional
                value={formData.organizationName}
                onChange={(value) => setFormData(prev => ({ ...prev, organizationName: value }))}
                autocomplete="organization"
              />
              <InputField
                label="Job title"
                optional
                value={formData.jobTitle}
                onChange={(value) => setFormData(prev => ({ ...prev, jobTitle: value }))}
                autocomplete="organization-title"
              />
              <label htmlFor="subscribe-newsletter" className="flex items-start gap-2 cursor-pointer">
                <input
                  id="subscribe-newsletter"
                  name="subscribe_newsletter"
                  type="checkbox"
                  checked={formData.subscribeNewsletter}
                  onChange={(e) => setFormData(prev => ({ ...prev, subscribeNewsletter: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Subscribe to newsletter</span>
              </label>
              <label htmlFor="consent-to-data" className="flex items-start gap-2 cursor-pointer">
                <input
                  id="consent-to-data"
                  name="consent_to_data"
                  type="checkbox"
                  checked={formData.consentToData}
                  onChange={(e) => setFormData(prev => ({ ...prev, consentToData: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  aria-required="true"
                  aria-invalid={!!errors.consentToData}
                  aria-describedby={errors.consentToData ? "consent-error" : undefined}
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  I agree to the processing of personal data *
                </span>
              </label>
              {errors.consentToData && (
                <p id="consent-error" className="text-sm text-red-600 dark:text-red-400" role="alert">{errors.consentToData}</p>
              )}
              {submitError && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
                </div>
              )}

              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  onClick={handleBack}
                  className="transition-colors active:!bg-slate-500 dark:active:!bg-slate-600"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="transition-colors active:!bg-slate-500 dark:active:!bg-slate-600"
                >
                  {isSubmitting ? 'Submitting...' : 'Join Waitlist'}
                </Button>
              </div>
            </form>
          </CardContainer>
        )

      case TOTAL_CARDS + 1:
        return (
          <>
            <CardContent className="text-center py-12">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center mb-4">
                <svg className="h-10 w-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Thanks for joining!
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                We'll review your submission and send you access soon.
              </p>
            </CardContent>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-16">
      {currentCard <= TOTAL_CARDS && renderProgressIndicator()}

      {currentCard === TOTAL_CARDS + 1 ? (
        <Card className={`shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm mb-8 transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}>
          {renderCard()}
        </Card>
      ) : (
        <Card className={`shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm mb-8 transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}>
          {renderCard()}
        </Card>
      )}
    </div>
  )
}

function CardContainer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <CardHeader>
        <div className="flex items-center justify-center mb-6">
          <Image
            src="/logo.webp"
            alt="App Logo"
            width={200}
            height={60}
            className="w-40 h-auto sm:w-52 sm:h-auto"
            priority
          />
        </div>

        <CardTitle className="text-xl sm:text-2xl text-center">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {children}
      </CardContent>
    </>
  )
}

function OptionButton({
  selected,
  onClick,
  children
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full min-h-[52px] px-4 py-3 text-left text-base font-medium rounded-lg transition-all flex items-center gap-3 ${
        selected
          ? 'border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100'
          : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
      }`}
    >
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {selected && (
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <span className="flex-1">{children}</span>
    </button>
  )
}

function InputField({
  label,
  type = 'text',
  required = false,
  optional = false,
  value,
  onChange,
  error,
  autocomplete
}: {
  label: string
  type?: string
  required?: boolean
  optional?: boolean
  value: string
  onChange: (value: string) => void
  error?: string
  autocomplete?: string
}) {
  const fieldId = `field-${label.toLowerCase().replace(/\s+/g, '-')}`
  const fieldName = label.toLowerCase().replace(/\s+/g, '_')

  return (
    <div>
      <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {optional && <span className="text-slate-500 dark:text-slate-400 ml-1">(optional)</span>}
      </label>
      <input
        id={fieldId}
        name={fieldName}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autocomplete}
        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
        }`}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
      />
      {error && (
        <p id={`${fieldId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}