import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve/reject
 * within the given milliseconds, it rejects with a timeout error.
 * Prevents hanging Supabase calls from freezing the UI or middleware.
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ])
}

/**
 * Returns a user-friendly error message instead of raw technical details.
 */
export function friendlyError(err: unknown): string {
  if (err instanceof Error && err.message.includes('timed out')) {
    return 'Connection is slow — please try again'
  }
  if (err instanceof Error) {
    return err.message
  }
  return 'Something went wrong — please try again'
}

/**
 * Retries an async function with exponential backoff.
 * Useful for initial data fetches that may fail due to transient issues.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)))
      }
    }
  }
  throw lastError
}
