import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, QueryContext } from "@medusajs/framework/utils"
import { subscriptionPrice } from "../modules/subscription/constants"

export type RefillInfo = {
  variantId: string
  productId: string
  productTitle: string
  lineTitle: string | null
  price: number
  subscriptionPrice: number
}

export async function getUkRegion(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "region",
    fields: ["id", "currency_code", "countries.iso_2"],
  })
  const region = data.find((r: any) => r.countries?.some((c: any) => c?.iso_2 === "gb")) ?? data[0]
  if (!region) throw new MedusaError(MedusaError.Types.NOT_FOUND, "No region configured")
  return region as { id: string; currency_code: string }
}

/** Looks up a refill variant and its current price. Throws if it isn't a refill. */
export async function getRefill(container: MedusaContainer, variantId: string): Promise<RefillInfo> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const region = await getUkRegion(container)
  const { data } = await query.graph({
    entity: "variant",
    fields: [
      "id",
      "title",
      "options.value",
      "options.option.title",
      "product.id",
      "product.title",
      "product.collection.title",
      "calculated_price.calculated_amount",
    ],
    filters: { id: variantId },
    context: {
      calculated_price: QueryContext({ region_id: region.id, currency_code: region.currency_code }),
    },
  })
  const v: any = data[0]
  if (!v) throw new MedusaError(MedusaError.Types.NOT_FOUND, "That product isn’t available")
  const type = (
    v.options?.find((o: any) => o?.option?.title === "Type")?.value ?? v.title ?? ""
  ).toLowerCase()
  if (type !== "refill") {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Only refills can be subscribed to")
  }
  const price = Number(v.calculated_price?.calculated_amount)
  if (!Number.isFinite(price) || price <= 0) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "That refill has no price")
  }
  return {
    variantId: v.id,
    productId: v.product.id,
    productTitle: v.product.title,
    lineTitle: v.product.collection?.title ?? null,
    price,
    subscriptionPrice: subscriptionPrice(price),
  }
}
