import Link from "next/link"
import { notFound } from "next/navigation"
import { ProductCard, ProductGrid } from "@/components/product/ProductCard"
import { getLines, getScents } from "@/lib/catalogue"

const FILTERS = [
  { key: "all", label: "All scents", href: "/shop" },
  { key: "hang", label: "Hang", href: "/shop/hang" },
  { key: "stick", label: "Stick", href: "/shop/stick" },
  { key: "clip", label: "Clip", href: "/shop/clip" },
  { key: "refills", label: "Refills", href: "/shop/refills" },
]

export async function ShopView({ filter }: { filter: string }) {
  const [lines, scents] = await Promise.all([getLines(), getScents()])
  const isRefills = filter === "refills"
  const line = lines.find((l) => l.handle === filter)
  if (filter !== "all" && !isRefills && !line) notFound()

  const title = isRefills ? "Refills" : line ? line.title : "All scents"
  const intro = isRefills
    ? "Keep the bottle, the slab or the clip. Top up the scent from £6, posted flat through your letterbox."
    : line
      ? line.intro
      : "Nine real fragrances across three formats. Every one built from proper notes — no fake cherry, no toilet-cleaner pine."

  const items = line
    ? scents.filter((s) => s.line?.id === line.id)
    : isRefills
      ? scents.filter((s) => s.refill)
      : scents

  const filters = [
    FILTERS[0],
    ...lines.map((l) => ({ key: l.handle, label: l.title, href: `/shop/${l.handle}` })),
    FILTERS[4],
  ]

  return (
    <div className="mx-auto max-w-site px-page pb-[90px] pt-[30px]">
      <nav aria-label="Breadcrumb" className="mb-[18px] text-[13px] text-muted-2">
        <Link href="/" className="text-muted-2">
          Home
        </Link>{" "}
        / {title}
      </nav>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-end gap-[30px] border-b border-line pb-9">
        <h1 className="font-serif text-[clamp(56px,6vw,88px)] font-normal leading-none">{title}</h1>
        <p className="max-w-[520px] text-pretty text-[17px] leading-[1.6] text-ink-2">{intro}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-[30px] pt-[22px]">
        <nav aria-label="Filter scents" className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const active = f.key === filter
            return (
              <Link
                key={f.key}
                href={f.href}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={`rounded-full border border-ink px-5 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                  active ? "bg-ink text-paper hover:text-paper" : "bg-transparent text-ink hover:bg-ink/5"
                }`}
              >
                {f.label}
              </Link>
            )
          })}
        </nav>
        <div className="text-sm text-muted">
          {items.length} {items.length === 1 ? "scent" : "scents"}
        </div>
      </div>

      <ProductGrid min={260}>
        {items.map((s) => (
          <ProductCard key={s.id} scent={s} refill={isRefills} />
        ))}
      </ProductGrid>
    </div>
  )
}
