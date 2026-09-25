import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const STOREFRONT_URL = (process.env.STOREFRONT_URL || "https://coastfragrances.co.uk").replace(/\/$/, "")

/** Emails a password reset link to customers who ask for one. */
export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<{ entity_id: string; actor_type: string; token: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  if (data.actor_type !== "customer") return

  try {
    const url = new URL(`${STOREFRONT_URL}/account/reset-password`)
    url.searchParams.set("token", data.token)
    url.searchParams.set("email", data.entity_id)
    await container.resolve(Modules.NOTIFICATION).createNotifications({
      to: data.entity_id,
      channel: "email",
      template: "password-reset",
      data: { reset_url: url.toString(), storefront_url: STOREFRONT_URL },
    })
  } catch (e) {
    logger.error(`[password-reset] email failed: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
