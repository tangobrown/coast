import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { SUBSCRIPTION_MODULE } from "../modules/subscription"
import { MAX_PAYMENT_ATTEMPTS } from "../modules/subscription/constants"
import type SubscriptionModuleService from "../modules/subscription/service"
import { renewSubscription } from "../subscriptions/renew"

/** Charges and ships every subscription that's due. Runs hourly. */
export default async function renewSubscriptionsJob(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const subscriptions: SubscriptionModuleService = container.resolve(SUBSCRIPTION_MODULE)

  const due = await subscriptions.listSubscriptions(
    {
      status: ["active", "payment_failed"],
      next_charge_at: { $lte: new Date() },
      failure_count: { $lt: MAX_PAYMENT_ATTEMPTS },
    },
    { take: 200, order: { next_charge_at: "ASC" } }
  )
  if (!due.length) return

  logger.info(`[subscriptions] ${due.length} due for renewal`)
  for (const sub of due) {
    try {
      await renewSubscription(container, sub)
    } catch (e) {
      logger.error(`[subscriptions] renewing ${sub.id} failed: ${(e as Error).message}`)
    }
  }
}

export const config = {
  name: "renew-subscriptions",
  schedule: "15 * * * *",
}
