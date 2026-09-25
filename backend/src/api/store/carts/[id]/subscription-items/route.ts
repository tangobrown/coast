import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { addToCartWorkflow } from "@medusajs/medusa/core-flows"
import { isAllowedInterval } from "../../../../../modules/subscription/constants"
import { SUBSCRIPTION_ITEM_KEY } from "../../../../../subscriptions/from-order"
import { getRefill } from "../../../../../subscriptions/refill"

type Body = { variant_id?: string; quantity?: number; interval_weeks?: number }

/**
 * Adds a refill to the bag as a subscription: 5% off the current refill price,
 * with the delivery frequency stored on the line item.
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const { variant_id, quantity = 1, interval_weeks } = req.body ?? {}
  if (!variant_id) throw new MedusaError(MedusaError.Types.INVALID_DATA, "variant_id is required")
  if (!isAllowedInterval(interval_weeks)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Choose a delivery every 4, 6 or 8 weeks")
  }
  const qty = Math.floor(Number(quantity))
  if (!Number.isFinite(qty) || qty < 1 || qty > 20) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid quantity")
  }

  const refill = await getRefill(req.scope, variant_id)
  await addToCartWorkflow(req.scope).run({
    input: {
      cart_id: req.params.id,
      items: [
        {
          variant_id,
          quantity: qty,
          unit_price: refill.subscriptionPrice,
          compare_at_unit_price: refill.price,
          metadata: { [SUBSCRIPTION_ITEM_KEY]: Number(interval_weeks) },
        },
      ],
    },
  })

  // The storefront re-reads the cart through the normal store API afterwards.
  res.json({ cart: { id: req.params.id } })
}
