import type { Metadata } from "next"
import Link from "next/link"
import { ProductCard, ProductGrid } from "@/components/product/ProductCard"
import { getScents } from "@/lib/catalogue"
import { searchItems, toSearchItems } from "@/lib/search"

export const metadata: Metadata = { title: "Search", robots: { index: false } }

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").slice(0, 100)
  const scents = await getScents()
  const handles = searchItems(toSearchItems(scents), q).map((r) => r.handle)
  const results = handles.map((h) => scents.find((s) => s.handle === h)!).filter(Boolean)

  return (
    <div className="mx-auto max-w-site px-page pb-[90px] pt-[30px]">
      <nav aria-label="Breadcrumb" className="mb-[18px] text-[13px] text-muted-2">
        <Link href="/" className="text-muted-2">
          Home
        </Link>{" "}
        / Search
      </nav>
      <div className="mb-9 border-b border-line pb-9">
        <h1 className="font-serif text-[clamp(44px,5vw,72px)] font-normal leading-none">
          {q ? (
            <>
              Results for <em className="text-teal">“{q}”</em>
            </>
          ) : (
            "Search"
          )}
        </h1>
        <p className="mt-4 text-[15px] text-muted">
          {results.length} {results.length === 1 ? "scent" : "scents"}
        </p>
      </div>
      {results.length ? (
        <ProductGrid min={260}>
          {results.map((s) => (
            <ProductCard key={s.id} scent={s} />
          ))}
        </ProductGrid>
      ) : (
        <div className="rounded-[10px] bg-paper px-[30px] py-[60px] text-center">
          <p className="mb-2.5 font-serif text-[30px]">No scents match that.</p>
          <p className="mb-6 text-muted">Try a note like “cedar”, “fig” or “bergamot”.</p>
          <Link href="/shop" className="font-semibold text-teal">
            Browse all scents →
          </Link>
        </div>
      )}
    </div>
  )
}
