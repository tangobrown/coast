/** £16 when whole, £3.95 otherwise. Medusa v2 amounts are in major units. */
export function formatMoney(amount: number | null | undefined): string {
  const n = Number(amount ?? 0)
  const rounded = Math.round(n * 100) / 100
  return "£" + (Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2))
}

export const FREE_SHIPPING_THRESHOLD = 30

export function freeShippingProgress(subtotal: number) {
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  return {
    unlocked: remaining === 0,
    message:
      remaining === 0
        ? "You’ve unlocked free UK delivery."
        : `You’re ${formatMoney(remaining)} away from free UK delivery.`,
    percent: Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100),
  }
}
