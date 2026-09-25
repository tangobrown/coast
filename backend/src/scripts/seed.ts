import { ExecArgs, MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createProductTagsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import { LINES, SCENTS } from "./data/catalogue"

export const REGION_NAME = "United Kingdom"
export const FREE_SHIPPING_THRESHOLD = 30
const BESTSELLER_ORDER = [
  "sea-salt-driftwood",
  "fig-vetiver",
  "cedar-smoke",
  "bergamot-grove",
]

/** Payment providers the UK region should offer, given the current env. */
export function wantedPaymentProviders(): string[] {
  return process.env.STRIPE_API_KEY ? ["pp_stripe_stripe"] : ["pp_system_default"]
}

export async function seedCoast(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const storeModuleService = container.resolve(Modules.STORE)

  logger.info("Seeding Coast store…")
  const [store] = await storeModuleService.listStores()

  let [salesChannel] = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  })
  if (!salesChannel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: "Default Sales Channel" }] },
    })
    salesChannel = result[0]
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        name: "Coast Fragrances",
        supported_currencies: [{ currency_code: "gbp", is_default: true, is_tax_inclusive: true }],
        default_sales_channel_id: salesChannel.id,
      },
    },
  })

  // ── Region & tax ──────────────────────────────────────────────────────
  // UK prices are shown VAT-inclusive, so £16 on the site is £16 at checkout.
  const { result: regions } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: REGION_NAME,
          currency_code: "gbp",
          countries: ["gb"],
          payment_providers: wantedPaymentProviders(),
          is_tax_inclusive: true,
        },
      ],
    },
  })
  const region = regions[0]

  await createTaxRegionsWorkflow(container).run({
    input: [
      {
        country_code: "gb",
        provider_id: "tp_system",
        default_tax_rate: { name: "VAT", code: "VAT", rate: 20 },
      },
    ],
  })

  // ── Stock location & fulfilment ───────────────────────────────────────
  const { result: locations } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: "Coast Studio",
          address: { city: "London", country_code: "GB", address_1: "" },
        },
      ],
    },
  })
  const location = locations[0]

  await updateStoresWorkflow(container).run({
    input: { selector: { id: store.id }, update: { default_location_id: location.id } },
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  })

  let [shippingProfile] = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  })
  if (!shippingProfile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
    })
    shippingProfile = result[0]
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "UK delivery",
    type: "shipping",
    service_zones: [
      { name: "United Kingdom", geo_zones: [{ country_code: "gb", type: "country" }] },
    ],
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
  })

  const storeRules = [
    { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
    { attribute: "is_return", value: "false", operator: "eq" as const },
  ]

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard · Royal Mail",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard · Royal Mail",
          description: "2–4 working days · letterbox friendly",
          code: "standard",
        },
        prices: [
          { currency_code: "gbp", amount: 3.95 },
          { region_id: region.id, amount: 3.95 },
          // Free once the bag reaches the threshold.
          {
            region_id: region.id,
            amount: 0,
            rules: [
              { attribute: "item_total", operator: "gte", value: FREE_SHIPPING_THRESHOLD },
            ],
          },
        ],
        rules: storeRules,
      },
      {
        name: "Next day · DPD",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Next day · DPD",
          description: "Order by 2pm, Mon–Fri",
          code: "next-day",
        },
        prices: [
          { currency_code: "gbp", amount: 5.95 },
          { region_id: region.id, amount: 5.95 },
        ],
        rules: storeRules,
      },
    ],
  })

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: location.id, add: [salesChannel.id] },
  })

  // ── Publishable API key (the storefront needs this) ───────────────────
  const { data: keys } = await query.graph({
    entity: "api_key",
    fields: ["id", "token"],
    filters: { type: "publishable" },
  })
  let apiKey = keys?.[0] as { id: string; token: string } | undefined
  if (!apiKey) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: { api_keys: [{ title: "Coast storefront", type: "publishable", created_by: "" }] },
    })
    apiKey = result[0] as { id: string; token: string }
  }
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: apiKey.id, add: [salesChannel.id] },
  })

  // ── Catalogue ─────────────────────────────────────────────────────────
  const { result: collections } = await createCollectionsWorkflow(container).run({
    input: {
      collections: LINES.map((l) => ({
        title: l.title,
        handle: l.handle,
        metadata: l.metadata,
      })),
    },
  })
  const collectionId = (handle: string) =>
    collections.find((c) => c.handle === handle)!.id

  const { result: tags } = await createProductTagsWorkflow(container).run({
    input: { product_tags: [{ value: "bestseller" }] },
  })

  await createProductsWorkflow(container).run({
    input: {
      products: SCENTS.map((s, index) => {
        const line = LINES.find((l) => l.handle === s.line)!
        const rank = BESTSELLER_ORDER.indexOf(s.handle)
        const sku = s.handle.toUpperCase()
        return {
          title: s.title,
          handle: s.handle,
          subtitle: s.short_notes,
          description: `${s.short_notes} ${line.metadata.desc}`,
          status: ProductStatus.PUBLISHED,
          collection_id: collectionId(s.line),
          tag_ids: rank >= 0 ? [tags[0].id] : [],
          shipping_profile_id: shippingProfile!.id,
          metadata: {
            short_notes: s.short_notes,
            notes_top: s.top,
            notes_heart: s.heart,
            notes_base: s.base,
            sort: index + 1,
            ...(rank >= 0 ? { bestseller_rank: rank + 1 } : {}),
          },
          options: [{ title: "Type", values: ["Full", "Refill"] }],
          variants: [
            {
              title: "Full",
              sku: `${sku}-FULL`,
              options: { Type: "Full" },
              manage_inventory: false,
              variant_rank: 0,
              prices: [{ amount: s.full, currency_code: "gbp" }],
            },
            {
              title: "Refill",
              sku: `${sku}-REFILL`,
              options: { Type: "Refill" },
              manage_inventory: false,
              variant_rank: 1,
              prices: [{ amount: s.refill, currency_code: "gbp" }],
            },
          ],
          sales_channels: [{ id: salesChannel.id }],
        }
      }),
    },
  })

  logger.info("Finished seeding Coast store.")
  logger.info(`Publishable API key: ${apiKey.token}`)
  return { apiKey: apiKey.token }
}

export default async function seed({ container }: ExecArgs) {
  await seedCoast(container)
}
