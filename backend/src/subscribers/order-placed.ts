import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const STOREFRONT_URL = (process.env.STOREFRONT_URL || "https://coastfragrances.co.uk").replace(/\/$/, "")

/** Emails the customer an order confirmation. */
export default async function orderPlacedHandler({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notifications = container.resolve(Modules.NOTIFICATION)

  try {
    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "metadata",
        "item_total",
        "shipping_total",
        "discount_total",
        "total",
        "items.product_title",
        "items.variant_title",
        "items.product_collection",
        "items.title",
        "items.quantity",
        "items.unit_price",
        "shipping_address.*",
        "shipping_methods.name",
      ],
      filters: { id: data.id },
    })
    if (!order?.email) return

    const a = order.shipping_address
    await notifications.createNotifications({
      to: order.email,
      channel: "email",
      template: "order-placed",
      data: {
        display_id: order.display_id,
        items: (order.items ?? []).filter(Boolean).map((i: any) => ({
          title: i.product_title ?? i.title,
          subtitle: [i.product_collection, i.variant_title].filter(Boolean).join(" · "),
          quantity: Number(i.quantity),
          total: Number(i.unit_price) * Number(i.quantity),
        })),
        subtotal: Number(order.item_total ?? 0),
        shipping_total: Number(order.shipping_total ?? 0),
        discount_total: Number(order.discount_total ?? 0),
        total: Number(order.total ?? 0),
        shipping_method: order.shipping_methods?.[0]?.name,
        shipping_address: a
          ? [
              [a.first_name, a.last_name].filter(Boolean).join(" "),
              a.address_1,
              a.address_2,
              a.city,
              a.postal_code,
            ].filter(Boolean)
          : [],
        refill_reminders: (order.metadata as any)?.refill_reminders !== false,
        storefront_url: STOREFRONT_URL,
      },
    })
  } catch (e) {
    // Never fail the order because an email couldn't be sent.
    logger.error(`[order-placed] confirmation email for ${data.id} failed: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
