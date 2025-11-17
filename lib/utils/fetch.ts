import {
  DEFAULT_MAX_RETRY_ATTEMPTS,
  DEFAULT_RETRY_BASE_DELAY_MS,
  DEFAULT_FETCH_RETRY_BASE_DELAY_MS,
} from '@/lib/utils/constants'

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])

export type RetryOptions = {
  maxAttempts?: number
  baseDelayMs?: number
  backoffFactor?: number
  jitter?: number
  isRetryable?: (error: any) => boolean
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const getDelayMs = (base: number, attempt: number) => {
  const exponential = base * Math.pow(2, attempt)
  const jitter = Math.random() * base
  return exponential + jitter
}

/**
 * Retry function with exponential backoff, jitter, and configurable retry logic
 *
 * @param fn - Function to retry
 * @param options - Retry configuration
 * @param options.maxAttempts - Maximum number of attempts (default: 3)
 * @param options.baseDelayMs - Base delay in milliseconds (default: 500)
 * @param options.backoffFactor - Exponential backoff multiplier (default: 2)
 * @param options.jitter - Jitter factor as percentage (default: 0.25 = 25%)
 * @param options.isRetryable - Predicate to determine if error is retryable (default: checks for 429, 5xx status codes)
 */
export async function retryWithJitter<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_RETRY_ATTEMPTS
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS
  const backoffFactor = options.backoffFactor ?? 2
  const jitter = options.jitter ?? 0.25
  const isRetryable = options.isRetryable ?? ((err: any) => {
    return [429, 500, 502, 503, 504].includes(err?.status ?? 0)
  })

  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (error) {
      if (error instanceof Error &&
          (error.name === 'AbortError' || error.message.includes('aborted'))) {
        throw error
      }

      attempt++

      if (attempt >= maxAttempts || !isRetryable(error)) {
        throw error
      }

      const exponentialDelay = baseDelayMs * Math.pow(backoffFactor, attempt - 1)
      const jitterAmount = (Math.random() - 0.5) * 2 * jitter * exponentialDelay
      const totalDelay = exponentialDelay + jitterAmount

      console.warn(`[retry] Attempt ${attempt} failed → retrying in ${totalDelay.toFixed(0)}ms`)
      await sleep(totalDelay)
    }
  }
}

export async function retryFetch(
  input: RequestInfo | URL,
  init: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_RETRY_ATTEMPTS
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_FETCH_RETRY_BASE_DELAY_MS

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (init.signal?.aborted) {
      throw new DOMException('Request aborted', 'AbortError')
    }

    try {
      const response = await fetch(input, init)

      if (!RETRYABLE_STATUS.has(response.status) || attempt === maxAttempts - 1) {
        return response
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error
      }

      if (attempt === maxAttempts - 1) {
        throw error
      }
    }

    const delay = getDelayMs(baseDelayMs, attempt)
    await sleep(delay)
  }

  throw new Error('retryFetch reached an unexpected state')
}