import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { SUBSCRIPTION_MODULE } from "../../../../../../modules/subscription"
import { addWeeks, isAllowedInterval } from "../../../../../../modules/subscription/constants"
import type SubscriptionModuleService from "../../../../../../modules/subscription/service"
import { getRefill } from "../../../../../../subscriptions/refill"
import { renewSubscription } from "../../../../../../subscriptions/renew"
import { serializeSubscription } from "../../../../../../subscriptions/serialize"

type Body = {
  action?: "skip" | "pause" | "resume" | "cancel" | "retry" | "update"
  interval_weeks?: number
  variant_id?: string
}

const DAY = 24 * 60 * 60 * 1000
const notBefore = (d: Date, min: Date) => (d.getTime() < min.getTime() ? min : d)

async function loadOwn(req: AuthenticatedMedusaRequest) {
  const subscriptions: SubscriptionModuleService = req.scope.resolve(SUBSCRIPTION_MODULE)
  const [sub] = await subscriptions.listSubscriptions({
    id: req.params.id,
    customer_id: req.auth_context.actor_id,
  })
  if (!sub) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Subscription not found")
  return { sub, subscriptions }
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { sub } = await loadOwn(req)
  res.json({ subscription: await serializeSubscription(req.scope, sub) })
}

/** Self-service changes: skip, pause, resume, cancel, retry payment, or update scent/frequency. */
export async function POST(req: AuthenticatedMedusaRequest<Body>, res: MedusaResponse) {
  const { sub, subscriptions } = await loadOwn(req)
  const { action, interval_weeks, variant_id } = req.body ?? {}
  const now = new Date()
  const tomorrow = new Date(now.getTime() + DAY)

  if (sub.status === "cancelled" && action !== "resume") {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "This subscription has been cancelled")
  }

  switch (action) {
    case "skip": {
      if (sub.status !== "active") throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Only active subscriptions can skip")
      await subscriptions.updateSubscriptions({
        id: sub.id,
        next_charge_at: addWeeks(new Date(sub.next_charge_at), sub.interval_weeks),
      })
      break
    }
    case "pause":
      await subscriptions.updateSubscriptions({ id: sub.id, status: "paused" })
      break
    case "resume":
      await subscriptions.updateSubscriptions({
        id: sub.id,
        status: "active",
        cancelled_at: null,
        failure_count: 0,
        next_charge_at: notBefore(new Date(sub.next_charge_at), tomorrow),
      })
      break
    case "cancel":
      await subscriptions.updateSubscriptions({ id: sub.id, status: "cancelled", cancelled_at: now })
      break
    case "retry": {
      if (sub.status !== "payment_failed") {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "There’s no failed payment to retry")
      }
      const result = await renewSubscription(req.scope, sub)
      if (!result.ok) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `Payment failed: ${result.reason}`)
      break
    }
    case "update": {
      const update: Record<string, unknown> = { id: sub.id }
      if (interval_weeks !== undefined) {
        if (!isAllowedInterval(interval_weeks)) {
          throw new MedusaError(MedusaError.Types.INVALID_DATA, "Choose every 4, 6 or 8 weeks")
        }
        update.interval_weeks = Number(interval_weeks)
        // Shift the scheduled date by the difference, so any skipped delivery stays skipped.
        const shifted = addWeeks(new Date(sub.next_charge_at), Number(interval_weeks) - sub.interval_weeks)
        update.next_charge_at = notBefore(shifted, tomorrow)
      }
      if (variant_id !== undefined && variant_id !== sub.variant_id) {
        const refill = await getRefill(req.scope, variant_id)
        Object.assign(update, {
          variant_id: refill.variantId,
          product_id: refill.productId,
          product_title: refill.productTitle,
          line_title: refill.lineTitle,
        })
      }
      await subscriptions.updateSubscriptions(update as any)
      break
    }
    default:
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Unknown action")
  }

  const updated = await subscriptions.retrieveSubscription(sub.id)
  res.json({ subscription: await serializeSubscription(req.scope, updated) })
}
