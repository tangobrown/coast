import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import { createCollectionsWorkflow, createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { SCENTS } from "../scripts/data/catalogue"

// Placeholder data — edit freely in the Medusa admin afterwards.
const WIPE_LINE = {
  handle: "wipe",
  title: "Wipe",
  metadata: {
    sort: 4,
    format: "Car wipes",
    life: "Resealable pack · 20 or 60 wipes",
    intro:
      "Soft, lint-free wipes for a quick once-over of the dash, wheel and door handles — leaving a clean trace of real fragrance, not a chemical smell.",
    desc: "Lightly scented cleaning wipes for dashboards, consoles, steering wheels and door handles, in a resealable pack that lives in the glovebox.",
    how_to_use:
      "Pull a wipe from the pack and wipe down the dash, console, wheel and door handles. Buff dry with a cloth for a streak-free finish, then reseal the pack so the rest stay fresh.",
    whats_in_it:
      "Soft, non-woven wipes in a gentle cleaning solution, scented with the same perfumer-grade fragrance as our Hang, Stick and Clip.",
  },
}

const WIPE_SCENTS = ["sea-salt-driftwood", "eucalyptus-mist", "bergamot-grove"]
const PACKS = [
  { title: "20 wipes", sku: "20", price: 6 },
  { title: "60 wipes", sku: "60", price: 14 },
]

/**
 * Adds the Wipe line (collection + products) if the store doesn't have it yet.
 * Runs on every deploy but only ever creates it once, so admin edits stick.
 */
export async function ensureWipes(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existing } = await query.graph({
    entity: "product_collection",
    fields: ["id"],
    filters: { handle: WIPE_LINE.handle },
  })
  if (existing.length) return

  const [store] = await container.resolve(Modules.STORE).listStores({}, { select: ["id", "default_sales_channel_id"] })
  const [profile] = await container.resolve(Modules.FULFILLMENT).listShippingProfiles({ type: "default" })
  if (!store?.default_sales_channel_id || !profile) {
    logger.warn("[catalogue] Can't add wipes yet: no default sales channel or shipping profile")
    return
  }

  const {
    result: [collection],
  } = await createCollectionsWorkflow(container).run({
    input: { collections: [{ title: WIPE_LINE.title, handle: WIPE_LINE.handle, metadata: WIPE_LINE.metadata }] },
  })

  const products = WIPE_SCENTS.map((handle, i) => {
    const s = SCENTS.find((x) => x.handle === handle)!
    const sku = `${handle.toUpperCase()}-WIPES`
    return {
      title: s.title,
      handle: `${handle}-wipes`,
      subtitle: s.short_notes,
      description: `${s.short_notes} ${WIPE_LINE.metadata.desc}`,
      status: ProductStatus.PUBLISHED,
      collection_id: collection.id,
      shipping_profile_id: profile.id,
      metadata: {
        short_notes: s.short_notes,
        notes_top: s.top,
        notes_heart: s.heart,
        notes_base: s.base,
        sort: i + 1,
      },
      options: [{ title: "Pack", values: PACKS.map((p) => p.title) }],
      variants: PACKS.map((p, rank) => ({
        title: p.title,
        sku: `${sku}-${p.sku}`,
        options: { Pack: p.title },
        manage_inventory: false,
        variant_rank: rank,
        prices: [{ amount: p.price, currency_code: "gbp" }],
      })),
      sales_channels: [{ id: store.default_sales_channel_id! }],
    }
  })
  await createProductsWorkflow(container).run({ input: { products } })
  logger.info(`[catalogue] Added the Wipe line with ${products.length} products`)
}
