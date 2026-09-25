import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { SUBSCRIPTION_MODULE } from "../../../../../../modules/subscription"
import type SubscriptionModuleService from "../../../../../../modules/subscription/service"
import { getPaymentGateway } from "../../../../../../modules/subscription/stripe-gateway"
import { renewSubscription } from "../../../../../../subscriptions/renew"

/**
 * Finishes a card update: saves the confirmed card on all of the customer's
 * subscriptions, then retries any that were waiting on a failed payment.
 */
export async function POST(req: AuthenticatedMedusaRequest<{ setup_intent_id?: string }>, res: MedusaResponse) {
  const setupIntentId = req.body?.setup_intent_id
  if (!setupIntentId) throw new MedusaError(MedusaError.Types.INVALID_DATA, "setup_intent_id is required")

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const subscriptions: SubscriptionModuleService = req.scope.resolve(SUBSCRIPTION_MODULE)
  const own = await subscriptions.listSubscriptions({
    customer_id: req.auth_context.actor_id,
    status: ["active", "paused", "payment_failed"],
  })
  const stripeCustomer = own.find((s) => s.stripe_customer_id)?.stripe_customer_id
  if (!stripeCustomer) throw new MedusaError(MedusaError.Types.NOT_FOUND, "No saved payment details found")

  const paymentMethod = await getPaymentGateway().paymentMethodFromSetupIntent(setupIntentId, stripeCustomer)
  await subscriptions.updateSubscriptions(
    own.map((s) => ({ id: s.id, stripe_payment_method_id: paymentMethod, stripe_customer_id: stripeCustomer }))
  )

  const retried: string[] = []
  for (const s of own.filter((s) => s.status === "payment_failed")) {
    const fresh = await subscriptions.retrieveSubscription(s.id)
    const result = await renewSubscription(req.scope, fresh).catch((e) => {
      logger.error(`[subscriptions] retry after card update failed for ${s.id}: ${e.message}`)
      return { ok: false as const, reason: "error" }
    })
    if (result.ok) retried.push(s.id)
  }
  res.json({ updated: own.length, retried })
}
