import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createSubscriptionsFromOrder } from "../subscriptions/from-order"

/** Turns "subscribe" lines in a new order into refill subscriptions. */
export default async function createSubscriptionsHandler({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  try {
    await createSubscriptionsFromOrder(container, data.id)
  } catch (e) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .error(`[subscriptions] creating subscriptions for order ${data.id} failed: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
