import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { SUBSCRIPTION_MODULE } from "../../../../../../../modules/subscription"
import type SubscriptionModuleService from "../../../../../../../modules/subscription/service"
import { getPaymentGateway } from "../../../../../../../modules/subscription/stripe-gateway"

/** Starts a card update: returns a SetupIntent secret for Stripe's Payment Element. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const subscriptions: SubscriptionModuleService = req.scope.resolve(SUBSCRIPTION_MODULE)
  const [withCustomer] = await subscriptions.listSubscriptions(
    { customer_id: req.auth_context.actor_id, stripe_customer_id: { $ne: null } },
    { take: 1 }
  )
  if (!withCustomer?.stripe_customer_id) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "No saved payment details found")
  }
  const { clientSecret } = await getPaymentGateway().createSetupIntent(withCustomer.stripe_customer_id)
  res.json({ client_secret: clientSecret })
}
