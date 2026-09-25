import "server-only"
import type { HttpTypes } from "@medusajs/types"
import { sdk } from "./medusa"
import type { Line, Scent, ScentVariant } from "./types"

// Catalogue data changes rarely, so it's kept in memory and refreshed in the
// background at most once a minute. Pages render dynamically (they read the
// bag cookie), which switches off Next's fetch cache, so this cache is what
// keeps each page view and bag action from re-downloading the whole catalogue.
const CATALOGUE_TTL_MS = 60_000
const CATALOGUE_CACHE = { cache: "no-store" as const }

function cached<T>(load: () => Promise<T>): () => Promise<T> {
  let value: { data: T; at: number } | null = null
  let inflight: Promise<T> | null = null
  const refresh = () => {
    inflight ??= load()
      .then((data) => {
        value = { data, at: Date.now() }
        return data
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  }
  return async () => {
    if (!value) return refresh()
    // Serve what we have; refresh in the background once it's stale.
    if (Date.now() - value.at > CATALOGUE_TTL_MS) refresh().catch(() => {})
    return value.data
  }
}

export const getRegion = cached(async (): Promise<HttpTypes.StoreRegion> => {
  const { regions } = await sdk.client.fetch<HttpTypes.StoreRegionListResponse>(
    "/store/regions",
    { query: { fields: "id,name,currency_code,*countries" }, ...CATALOGUE_CACHE }
  )
  const region =
    regions.find((r) => r.countries?.some((c) => c.iso_2 === "gb")) ?? regions[0]
  if (!region) {
    throw new Error("No region found in Medusa. Has the backend been seeded?")
  }
  return region
})

function toLine(c: HttpTypes.StoreCollection | null | undefined): Line | null {
  if (!c) return null
  const m = (c.metadata ?? {}) as Record<string, any>
  return {
    id: c.id,
    handle: c.handle,
    title: c.title,
    format: m.format ?? c.title,
    life: m.life ?? "",
    intro: m.intro ?? "",
    desc: m.desc ?? "",
    howToUse: m.how_to_use ?? "",
    sort: Number(m.sort ?? 99),
  }
}

export const getLines = cached(async (): Promise<Line[]> => {
  const { collections } = await sdk.client.fetch<HttpTypes.StoreCollectionListResponse>(
    "/store/collections",
    { query: { fields: "id,handle,title,metadata", limit: 50 }, ...CATALOGUE_CACHE }
  )
  return collections
    .map((c) => toLine(c)!)
    .sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title))
})

function variantOf(
  p: HttpTypes.StoreProduct,
  kind: "full" | "refill"
): ScentVariant | null {
  const match = p.variants?.find((v) => {
    const label = (
      v.options?.find((o) => o.option?.title === "Type")?.value ??
      v.title ??
      ""
    ).toLowerCase()
    return kind === "refill" ? label === "refill" : label !== "refill"
  })
  if (!match) return null
  return { id: match.id, price: Number(match.calculated_price?.calculated_amount ?? 0) }
}

function toScent(p: HttpTypes.StoreProduct, lines: Line[]): Scent {
  const m = (p.metadata ?? {}) as Record<string, any>
  const line = lines.find((l) => l.id === p.collection_id) ?? toLine(p.collection)
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    description: p.description ?? "",
    shortNotes: m.short_notes ?? p.subtitle ?? "",
    notes: {
      top: m.notes_top ?? "",
      heart: m.notes_heart ?? "",
      base: m.notes_base ?? "",
    },
    line,
    full: variantOf(p, "full"),
    refill: variantOf(p, "refill"),
    thumbnail: p.thumbnail ?? p.images?.[0]?.url ?? null,
    images: (p.images ?? []).map((i) => i.url),
    sort: Number(m.sort ?? 999),
    bestsellerRank:
      m.bestseller_rank != null
        ? Number(m.bestseller_rank)
        : p.tags?.some((t) => t.value === "bestseller")
          ? 99
          : null,
  }
}

/** Every published scent, sorted by line, then `metadata.sort`, then title. */
export const getScents = cached(async (): Promise<Scent[]> => {
  const [region, lines] = await Promise.all([getRegion(), getLines()])
  const { products } = await sdk.client.fetch<HttpTypes.StoreProductListResponse>(
    "/store/products",
    {
      query: {
        region_id: region.id,
        limit: 200,
        fields:
          "id,handle,title,subtitle,description,thumbnail,metadata,collection_id,*images,*tags,*variants,*variants.options,*variants.options.option,*variants.calculated_price",
      },
      ...CATALOGUE_CACHE,
    }
  )
  const order = new Map(lines.map((l, i) => [l.id, i]))
  return products
    .map((p) => toScent(p, lines))
    .sort(
      (a, b) =>
        (order.get(a.line?.id ?? "") ?? 99) - (order.get(b.line?.id ?? "") ?? 99) ||
        a.sort - b.sort ||
        a.title.localeCompare(b.title)
    )
})

export async function getScent(handle: string): Promise<Scent | null> {
  const scents = await getScents()
  return scents.find((s) => s.handle === handle) ?? null
}

export async function getBestsellers(limit = 4): Promise<Scent[]> {
  const scents = await getScents()
  return scents
    .filter((s) => s.bestsellerRank != null)
    .sort((a, b) => a.bestsellerRank! - b.bestsellerRank!)
    .slice(0, limit)
}

export function fromPrice(scents: Scent[]): number | null {
  const prices = scents.map((s) => s.full?.price).filter((n): n is number => n != null)
  return prices.length ? Math.min(...prices) : null
}
