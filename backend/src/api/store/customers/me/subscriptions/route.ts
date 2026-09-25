import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SUBSCRIPTION_MODULE } from "../../../../../modules/subscription"
import type SubscriptionModuleService from "../../../../../modules/subscription/service"
import { serializeSubscription } from "../../../../../subscriptions/serialize"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const subscriptions: SubscriptionModuleService = req.scope.resolve(SUBSCRIPTION_MODULE)
  const list = await subscriptions.listSubscriptions(
    { customer_id: req.auth_context.actor_id },
    { order: { created_at: "DESC" } }
  )
  res.json({ subscriptions: await Promise.all(list.map((s) => serializeSubscription(req.scope, s))) })
}
