import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createUsersWorkflow,
  updateRegionsWorkflow,
} from "@medusajs/medusa/core-flows"
import { REGION_NAME, seedCoast, wantedPaymentProviders } from "./seed"

/**
 * Runs on every deploy (after migrations). Safe to run repeatedly:
 *  1. Seeds the catalogue the first time only.
 *  2. Points the UK region at Stripe once STRIPE_API_KEY is set.
 *  3. Creates the first admin user from MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD.
 *  4. Logs the storefront's publishable API key.
 */
export default async function bootstrap({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const regionService = container.resolve(Modules.REGION)

  // 1. Seed
  let [region] = await regionService.listRegions({ name: REGION_NAME })
  if (!region) {
    logger.info("[bootstrap] No UK region found — seeding the store.")
    await seedCoast(container)
    ;[region] = await regionService.listRegions({ name: REGION_NAME })
  }

  // 2. Payment providers
  const { data: regionData } = await query.graph({
    entity: "region",
    fields: ["id", "payment_providers.id"],
    filters: { id: region.id },
  })
  const current = (regionData[0]?.payment_providers ?? [])
    .map((p: any) => p?.id)
    .filter(Boolean)
    .sort()
  const wanted = wantedPaymentProviders().sort()
  if (current.join() !== wanted.join()) {
    await updateRegionsWorkflow(container).run({
      input: { selector: { id: region.id }, update: { payment_providers: wanted } },
    })
    logger.info(`[bootstrap] UK region payment providers set to: ${wanted.join(", ")}`)
  }
  if (!process.env.STRIPE_API_KEY) {
    logger.warn(
      "[bootstrap] STRIPE_API_KEY is not set — checkout cannot take real payments yet."
    )
  }

  // 3. First admin user
  const email = process.env.MEDUSA_ADMIN_EMAIL
  const password = process.env.MEDUSA_ADMIN_PASSWORD
  if (email && password) {
    const userService = container.resolve(Modules.USER)
    const [existing] = await userService.listUsers({ email })
    if (!existing) {
      const authService = container.resolve(Modules.AUTH)
      const { result: users } = await createUsersWorkflow(container).run({
        input: { users: [{ email }] },
      })
      const { authIdentity, error } = await authService.register("emailpass", {
        body: { email, password },
      })
      if (error || !authIdentity) {
        logger.error(`[bootstrap] Could not create admin user: ${error}`)
      } else {
        await authService.updateAuthIdentities({
          id: authIdentity.id,
          app_metadata: { user_id: users[0].id },
        })
        logger.info(`[bootstrap] Created admin user ${email}`)
      }
    }
  }

  // 4. Publishable key, so it's easy to find in the deploy logs
  const { data: keys } = await query.graph({
    entity: "api_key",
    fields: ["token"],
    filters: { type: "publishable" },
  })
  if (keys[0]) {
    logger.info(`[bootstrap] Storefront publishable key: ${keys[0].token}`)
  }
}
