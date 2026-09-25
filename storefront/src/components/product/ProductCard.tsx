import Link from "next/link"
import { formatMoney } from "@/lib/money"
import type { Scent } from "@/lib/types"
import { ProductImage } from "../ui/ProductImage"
import { tagPill } from "../ui/styles"

export function ProductCard({
  scent,
  refill = false,
  showNotes = true,
}: {
  scent: Scent
  refill?: boolean
  showNotes?: boolean
}) {
  const lineTitle = scent.line?.title ?? ""
  const price = refill ? scent.refill?.price : scent.full?.price
  const href = `/products/${scent.handle}${refill ? "?variant=refill" : ""}`

  return (
    <Link href={href} className="group block">
      <div className="relative mb-3.5">
        <ProductImage
          src={scent.thumbnail}
          alt={scent.title}
          label={scent.title}
          className="aspect-[4/5] rounded-lg"
        />
        {lineTitle && (
          <div className={`absolute left-3 top-3 ${tagPill}`}>
            {refill ? `${lineTitle} refill` : lineTitle}
          </div>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-2.5">
        <h3 className="text-base font-semibold text-ink transition-colors group-hover:text-teal">
          {scent.title}
        </h3>
        {price != null && <span className="text-[15px] font-semibold text-ink">{formatMoney(price)}</span>}
      </div>
      {showNotes && scent.shortNotes && (
        <p className="mt-[5px] text-[13.5px] leading-[1.45] text-muted">{scent.shortNotes}</p>
      )}
    </Link>
  )
}

export function ProductGrid({
  children,
  min = 240,
  className = "",
}: {
  children: React.ReactNode
  min?: 240 | 260
  className?: string
}) {
  return (
    <div
      className={`grid gap-[22px] max-sm:grid-cols-2 max-sm:gap-x-3 ${min === 260 ? "grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))] gap-y-9" : "grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))]"} ${className}`}
    >
      {children}
    </div>
  )
}
