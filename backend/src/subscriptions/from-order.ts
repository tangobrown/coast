import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { SUBSCRIPTION_MODULE } from "../modules/subscription"
import type SubscriptionModuleService from "../modules/subscription/service"
import { addWeeks, DEFAULT_INTERVAL_WEEKS, isAllowedInterval } from "../modules/subscription/constants"

export const SUBSCRIPTION_ITEM_KEY = "subscription_interval_weeks"

/** Stripe customer + saved card from the order's payment, if paid by Stripe. */
function stripeIds(order: any): { customer: string | null; paymentMethod: string | null } {
  for (const pc of order.payment_collections ?? []) {
    for (const p of pc?.payments ?? []) {
      const d = p?.data ?? {}
      const customer = typeof d.customer === "string" ? d.customer : d.customer?.id
      const pm = typeof d.payment_method === "string" ? d.payment_method : d.payment_method?.id
      if (customer || pm) return { customer: customer ?? null, paymentMethod: pm ?? null }
    }
  }
  return { customer: null, paymentMethod: null }
}

/** Creates a subscription for every "subscribe" line in a newly placed order. */
export async function createSubscriptionsFromOrder(container: MedusaContainer, orderId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const subscriptions: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE)

  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "email",
      "customer_id",
      "created_at",
      "items.id",
      "items.variant_id",
      "items.product_id",
      "items.product_title",
      "items.product_collection",
      "items.quantity",
      "items.metadata",
      "shipping_address.*",
      "payment_collections.payments.data",
    ],
    filters: { id: orderId },
  })
  if (!order) return []

  const subItems = (order.items ?? []).filter((i: any) => i?.metadata?.[SUBSCRIPTION_ITEM_KEY])
  if (!subItems.length) return []
  if (!order.customer_id) {
    logger.warn(`[subscriptions] order ${orderId} has subscription items but no customer; skipping`)
    return []
  }

  // Don't create duplicates if the event is delivered twice.
  const existing = await subscriptions.listSubscriptions({ origin_order_id: orderId })
  if (existing.length) return existing

  const { customer, paymentMethod } = stripeIds(order)
  const a: any = order.shipping_address ?? {}
  const address = {
    first_name: a.first_name,
    last_name: a.last_name,
    address_1: a.address_1,
    address_2: a.address_2,
    city: a.city,
    postal_code: a.postal_code,
    country_code: a.country_code ?? "gb",
    phone: a.phone,
  }
  const start = new Date(order.created_at as any)

  const created = await subscriptions.createSubscriptions(
    subItems.map((i: any) => {
      const weeks = Number(i.metadata[SUBSCRIPTION_ITEM_KEY])
      const interval = isAllowedInterval(weeks) ? weeks : DEFAULT_INTERVAL_WEEKS
      return {
        customer_id: order.customer_id!,
        email: order.email!,
        product_id: i.product_id,
        variant_id: i.variant_id,
        product_title: i.product_title,
        line_title: i.product_collection ?? null,
        quantity: Number(i.quantity) || 1,
        interval_weeks: interval,
        status: "active" as const,
        next_charge_at: addWeeks(start, interval),
        origin_order_id: order.id,
        last_order_id: order.id,
        stripe_customer_id: customer,
        stripe_payment_method_id: paymentMethod,
        shipping_address: address,
      }
    })
  )
  logger.info(`[subscriptions] created ${created.length} from order ${orderId}`)
  return created
}
