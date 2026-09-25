import type { MedusaContainer } from "@medusajs/framework/types"
import { getRefill } from "./refill"

/** What the storefront sees for a subscription (no Stripe ids). */
export async function serializeSubscription(container: MedusaContainer, sub: any) {
  let price: number | null = null
  let subscriptionPrice: number | null = null
  try {
    const refill = await getRefill(container, sub.variant_id)
    price = refill.price
    subscriptionPrice = refill.subscriptionPrice
  } catch {
    // Refill no longer on sale; still show the subscription.
  }
  return {
    id: sub.id,
    status: sub.status,
    product_id: sub.product_id,
    variant_id: sub.variant_id,
    product_title: sub.product_title,
    line_title: sub.line_title,
    quantity: sub.quantity,
    interval_weeks: sub.interval_weeks,
    next_charge_at: sub.next_charge_at,
    last_charged_at: sub.last_charged_at,
    last_failure_reason: sub.last_failure_reason,
    has_card: !!sub.stripe_payment_method_id,
    price,
    subscription_price: subscriptionPrice,
    created_at: sub.created_at,
  }
}
