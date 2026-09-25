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
 *  3. Makes sure an admin login exists with MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD
 *     (creating it, or resetting its password to match).
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

  // 3. Admin login — kept in sync with MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD
  //    so the Railway variables are always the working credentials.
  const email = process.env.MEDUSA_ADMIN_EMAIL?.trim()
  const password = process.env.MEDUSA_ADMIN_PASSWORD?.trim()
  if (email && password) {
    try {
      await ensureAdmin(container, email, password)
      logger.info(`[bootstrap] Admin login ready for ${email}`)
    } catch (e) {
      logger.error(`[bootstrap] Could not set up admin login: ${(e as Error).message}`)
    }
  } else {
    logger.warn("[bootstrap] MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD not set — no admin login created.")
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

async function ensureAdmin(container: ExecArgs["container"], email: string, password: string) {
  const userService = container.resolve(Modules.USER)
  const authService = container.resolve(Modules.AUTH)

  let [user] = await userService.listUsers({ email })
  if (!user) {
    const { result } = await createUsersWorkflow(container).run({ input: { users: [{ email }] } })
    user = result[0]
  }

  // Existing login: reset its password to the configured one.
  const updated = await authService.updateProvider("emailpass", { entity_id: email, password })
  if (updated.success && updated.authIdentity) {
    await authService.updateAuthIdentities({
      id: updated.authIdentity.id,
      app_metadata: { user_id: user.id },
    })
    return
  }

  // No login yet: register one and link it to the user.
  const { authIdentity, error } = await authService.register("emailpass", {
    body: { email, password },
  })
  if (error || !authIdentity) throw new Error(error ?? "register failed")
  await authService.updateAuthIdentities({
    id: authIdentity.id,
    app_metadata: { user_id: user.id },
  })
}
