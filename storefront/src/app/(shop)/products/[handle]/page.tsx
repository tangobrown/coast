import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BuyBox } from "@/components/product/BuyBox"
import { Gallery } from "@/components/product/Gallery"
import { ProductCard, ProductGrid } from "@/components/product/ProductCard"
import { getScent, getScents } from "@/lib/catalogue"

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ variant?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const scent = await getScent((await params).handle)
  if (!scent) return {}
  return { title: scent.title, description: scent.description }
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ handle }, { variant }] = await Promise.all([params, searchParams])
  const [scent, scents] = await Promise.all([getScent(handle), getScents()])
  if (!scent) notFound()

  const related = scents
    .filter((s) => s.id !== scent.id)
    .sort(
      (a, b) =>
        Number(b.line?.id === scent.line?.id) - Number(a.line?.id === scent.line?.id)
    )
    .slice(0, 4)

  return (
    <div className="mx-auto max-w-site px-page pb-[60px] pt-[30px]">
      <nav aria-label="Breadcrumb" className="mb-[22px] text-[13px] text-muted-2">
        <Link href="/shop" className="text-muted-2">
          Shop
        </Link>
        {scent.line && (
          <>
            {" / "}
            <Link href={`/shop/${scent.line.handle}`} className="text-muted-2">
              {scent.line.title}
            </Link>
          </>
        )}
        {" / "}
        {scent.title}
      </nav>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] items-start gap-[clamp(30px,5vw,72px)]">
        <Gallery title={scent.title} images={scent.images} />
        <BuyBox
          key={`${scent.id}-${variant}`}
          scent={scent}
          initialVariant={variant === "refill" ? "refill" : "full"}
        />
      </div>

      {related.length > 0 && (
        <section className="mt-[90px]">
          <h2 className="mb-[26px] font-serif text-[40px] font-normal leading-[1.05]">
            You might also like
          </h2>
          <ProductGrid>
            {related.map((s) => (
              <ProductCard key={s.id} scent={s} showNotes={false} />
            ))}
          </ProductGrid>
        </section>
      )}
    </div>
  )
}
