import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createOrderPaymentCollectionWorkflow,
  createOrderWorkflow,
  markPaymentCollectionAsPaid,
} from "@medusajs/medusa/core-flows"
import { SUBSCRIPTION_MODULE } from "../modules/subscription"
import type SubscriptionModuleService from "../modules/subscription/service"
import { addWeeks, MAX_PAYMENT_ATTEMPTS, RETRY_AFTER_DAYS } from "../modules/subscription/constants"
import { getPaymentGateway } from "../modules/subscription/stripe-gateway"
import { getRefill, getUkRegion } from "./refill"

const STOREFRONT_URL = (process.env.STOREFRONT_URL || "https://coastfragrances.co.uk").replace(/\/$/, "")
export const SUBSCRIBER_DELIVERY = "Subscriber delivery · Royal Mail"

type Sub = Awaited<ReturnType<SubscriptionModuleService["retrieveSubscription"]>>

export type RenewResult = { ok: true; orderId: string | null } | { ok: false; reason: string }

/**
 * Charges the saved card for the next refill and, if that succeeds, creates
 * the order (5% off, free delivery). Failed payments are retried every
 * RETRY_AFTER_DAYS days up to MAX_PAYMENT_ATTEMPTS, and the customer is emailed.
 */
export async function renewSubscription(container: MedusaContainer, sub: Sub): Promise<RenewResult> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const subscriptions: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE)
  const notifications = container.resolve(Modules.NOTIFICATION)
  const gateway = getPaymentGateway()

  const refill = await getRefill(container, sub.variant_id)
  const amount = Math.round(refill.subscriptionPrice * sub.quantity * 100) / 100
  const cycle = new Date(sub.next_charge_at).toISOString().slice(0, 10)

  // Each attempt gets its own key: Stripe replays the same result for a repeated key.
  const charge = await gateway.charge({
    customer: sub.stripe_customer_id,
    paymentMethod: sub.stripe_payment_method_id,
    amount,
    idempotencyKey: `${sub.id}-${cycle}-${sub.failure_count}`,
    description: `Coast refill subscription — ${sub.product_title}`,
    metadata: { subscription_id: sub.id, customer_id: sub.customer_id },
  })

  if (!charge.ok) {
    const attempts = sub.failure_count + 1
    await subscriptions.updateSubscriptions({
      id: sub.id,
      status: "payment_failed",
      failure_count: attempts,
      last_failure_reason: charge.reason,
      // Try again in a few days; after the last attempt, wait for the customer.
      next_charge_at:
        attempts < MAX_PAYMENT_ATTEMPTS ? addWeeks(new Date(), RETRY_AFTER_DAYS / 7) : sub.next_charge_at,
    })
    logger.warn(`[subscriptions] ${sub.id} payment failed (attempt ${attempts}): ${charge.reason}`)
    await notifications
      .createNotifications({
        to: sub.email,
        channel: "email",
        template: "subscription-payment-failed",
        data: { product_title: sub.product_title, amount, reason: charge.reason, storefront_url: STOREFRONT_URL },
      })
      .catch((e) => logger.error(`[subscriptions] failure email for ${sub.id} failed: ${e.message}`))
    return { ok: false, reason: charge.reason }
  }

  // Paid: move the schedule on straight away so a crash below can't double-charge.
  const now = new Date()
  await subscriptions.updateSubscriptions({
    id: sub.id,
    status: "active",
    failure_count: 0,
    last_failure_reason: null,
    last_charged_at: now,
    next_charge_at: addWeeks(now, sub.interval_weeks),
  })

  try {
    const orderId = await createRenewalOrder(container, sub, refill, amount, charge.id)
    await subscriptions.updateSubscriptions({ id: sub.id, last_order_id: orderId })
    logger.info(`[subscriptions] ${sub.id} renewed: order ${orderId}, ${amount} GBP (${charge.id})`)
    return { ok: true, orderId }
  } catch (e) {
    // The customer has paid, so this needs a person to create the order by hand.
    logger.error(
      `[subscriptions] ${sub.id} CHARGED (${charge.id}, £${amount}) BUT ORDER CREATION FAILED: ${(e as Error).message}`
    )
    return { ok: true, orderId: null }
  }
}

async function createRenewalOrder(
  container: MedusaContainer,
  sub: Sub,
  refill: Awaited<ReturnType<typeof getRefill>>,
  amount: number,
  paymentId: string
) {
  const storeService = container.resolve(Modules.STORE)
  const eventBus = container.resolve(Modules.EVENT_BUS)
  const [store] = await storeService.listStores({}, { select: ["id", "default_sales_channel_id"] })
  const region = await getUkRegion(container)
  const address = sub.shipping_address as Record<string, any>

  const { result: order } = await createOrderWorkflow(container).run({
    input: {
      region_id: region.id,
      currency_code: region.currency_code,
      sales_channel_id: store?.default_sales_channel_id ?? undefined,
      customer_id: sub.customer_id,
      email: sub.email,
      status: "pending",
      shipping_address: address,
      billing_address: address,
      items: [
        {
          variant_id: sub.variant_id,
          product_id: sub.product_id,
          title: sub.product_title,
          product_title: sub.product_title,
          variant_title: "Refill",
          quantity: sub.quantity,
          unit_price: refill.subscriptionPrice,
          is_tax_inclusive: true,
          metadata: { subscription_id: sub.id },
        },
      ],
      shipping_methods: [{ name: SUBSCRIBER_DELIVERY, amount: 0, is_tax_inclusive: true }],
      metadata: { subscription_id: sub.id, payment_reference: paymentId },
    } as any,
  })

  const { result: paymentCollection } = await createOrderPaymentCollectionWorkflow(container).run({
    input: { order_id: order.id, amount },
  })
  const pc = Array.isArray(paymentCollection) ? paymentCollection[0] : paymentCollection
  await markPaymentCollectionAsPaid(container).run({
    input: { order_id: order.id, payment_collection_id: pc.id },
  })

  // Same confirmation email as a normal order.
  await eventBus.emit({ name: "order.placed", data: { id: order.id } })
  return order.id
}
