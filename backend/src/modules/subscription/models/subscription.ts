import { model } from "@medusajs/framework/utils"

export const SUBSCRIPTION_STATUSES = ["active", "paused", "payment_failed", "cancelled"] as const

/** A refill delivered every N weeks, charged to the customer's saved card. */
const Subscription = model
  .define("subscription", {
    id: model.id({ prefix: "sub" }).primaryKey(),
    customer_id: model.text().index(),
    email: model.text(),
    product_id: model.text(),
    variant_id: model.text(),
    product_title: model.text(),
    line_title: model.text().nullable(),
    quantity: model.number().default(1),
    interval_weeks: model.number().default(6),
    status: model.enum([...SUBSCRIPTION_STATUSES]).default("active"),
    next_charge_at: model.dateTime().index(),
    last_charged_at: model.dateTime().nullable(),
    origin_order_id: model.text().nullable(),
    last_order_id: model.text().nullable(),
    stripe_customer_id: model.text().nullable(),
    stripe_payment_method_id: model.text().nullable(),
    shipping_address: model.json(),
    failure_count: model.number().default(0),
    last_failure_reason: model.text().nullable(),
    cancelled_at: model.dateTime().nullable(),
    metadata: model.json().nullable(),
  })

export default Subscription
