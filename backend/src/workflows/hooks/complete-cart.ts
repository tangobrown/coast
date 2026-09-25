import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { SUBSCRIPTION_ITEM_KEY } from "../../subscriptions/from-order"

// A subscription needs an account (to manage it) — refuse guest checkouts that contain one.
completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  const hasSubscription = (cart?.items ?? []).some((i: any) => i?.metadata?.[SUBSCRIPTION_ITEM_KEY])
  if (!hasSubscription) return

  const notAllowed = () =>
    new MedusaError(MedusaError.Types.NOT_ALLOWED, "Please log in or create an account to subscribe.")
  if (!cart.customer_id) throw notAllowed()

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "has_account"],
    filters: { id: cart.customer_id },
  })
  if (!data[0]?.has_account) throw notAllowed()
})
