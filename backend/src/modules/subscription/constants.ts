/** Subscribers pay this fraction of the normal refill price (5% off). */
export const SUBSCRIPTION_PRICE_FACTOR = 0.95
export const ALLOWED_INTERVAL_WEEKS = [4, 6, 8] as const
export const DEFAULT_INTERVAL_WEEKS = 6
/** Retry a failed renewal after this many days, up to MAX_PAYMENT_ATTEMPTS. */
export const RETRY_AFTER_DAYS = 3
export const MAX_PAYMENT_ATTEMPTS = 3

export function subscriptionPrice(refillPrice: number) {
  return Math.round(refillPrice * SUBSCRIPTION_PRICE_FACTOR * 100) / 100
}

export function addWeeks(date: Date, weeks: number) {
  return new Date(date.getTime() + weeks * 7 * 24 * 60 * 60 * 1000)
}

export function isAllowedInterval(n: unknown): n is (typeof ALLOWED_INTERVAL_WEEKS)[number] {
  return ALLOWED_INTERVAL_WEEKS.includes(Number(n) as any)
}
