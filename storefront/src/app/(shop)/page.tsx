import Link from "next/link"
import { ProductCard, ProductGrid } from "@/components/product/ProductCard"
import { ProductImage } from "@/components/ui/ProductImage"
import { btnOnTeal, btnPrimary, eyebrow } from "@/components/ui/styles"
import { fromPrice, getBestsellers, getLines, getScents } from "@/lib/catalogue"
import { formatMoney } from "@/lib/money"
import { SITE_IMAGES } from "@/lib/site-images"

export default async function HomePage() {
  const [lines, scents, bestsellers] = await Promise.all([
    getLines(),
    getScents(),
    getBestsellers(4),
  ])

  return (
    <div className="mx-auto max-w-site">
      {/* Hero */}
      <section className="px-page pb-[70px] pt-10 text-center">
        <div className={`mb-[22px] ${eyebrow}`}>Real fragrance · for the road</div>
        <h1 className="mx-auto mb-[30px] max-w-[1000px] text-balance font-serif text-[clamp(52px,7vw,104px)] font-normal leading-[0.98] tracking-[-0.01em]">
          Your car should smell like <em className="text-teal">somewhere</em>, not like nothing.
        </h1>
        <p className="mx-auto mb-[34px] max-w-[560px] text-pretty text-[19px] leading-normal text-ink-2">
          Sea salt off the coast. Cedar in the glovebox. Fig, warm on the dash. Fragrances made
          from real notes — never fake cherry, never bathroom cleaner.
        </p>
        <Link href="/shop" className={btnPrimary}>
          Find your scent
        </Link>
        <ProductImage
          src={SITE_IMAGES.homeHero}
          alt="A coastal drive"
          label="Wide editorial hero — coastal drive"
          sizes="100vw"
          priority
          className="mt-14 h-[clamp(320px,42vw,600px)] rounded-[10px]"
        />
      </section>

      {/* Line rows */}
      <section className="px-page py-5" aria-label="Our three formats">
        {lines.map((line, i) => {
          const from = fromPrice(scents.filter((s) => s.line?.id === line.id))
          return (
            <div
              key={line.id}
              className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-center gap-11 border-t border-line py-11"
            >
              <div className="flex gap-8">
                <div className="font-serif text-[52px] leading-none text-numeral">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <h2 className="mb-2.5 font-serif text-[44px] font-normal leading-[1.05]">
                    {line.title}
                  </h2>
                  <p className="mb-[18px] max-w-[440px] text-pretty text-[17px] leading-[1.6] text-ink-2">
                    {line.intro}
                  </p>
                  <Link href={`/shop/${line.handle}`} className="text-[15px] font-semibold text-teal">
                    Shop {line.title}
                    {from != null && ` · from ${formatMoney(from)}`} →
                  </Link>
                </div>
              </div>
              <ProductImage
                src={SITE_IMAGES.lines[line.handle]}
                alt={`${line.title} — ${line.format}`}
                label={line.title}
                sizes="(min-width: 768px) 50vw, 100vw"
                className="h-[300px] rounded-lg"
              />
            </div>
          )
        })}
      </section>

      {/* Best-sellers */}
      {bestsellers.length > 0 && (
        <section className="px-page pb-5 pt-10">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-serif text-[44px] font-normal leading-[1.05]">Best-sellers</h2>
            <Link href="/shop" className="text-[15px] font-semibold text-teal">
              Shop all scents →
            </Link>
          </div>
          <ProductGrid>
            {bestsellers.map((s) => (
              <ProductCard key={s.id} scent={s} />
            ))}
          </ProductGrid>
        </section>
      )}

      {/* Scent index */}
      <section className="mx-page my-[60px] rounded-[10px] bg-paper p-[clamp(28px,4vw,60px)]">
        <div className="mb-10 text-center">
          <h2 className="mb-2 font-serif text-[44px] font-normal leading-[1.05]">The scent index</h2>
          <p className="text-[17px] text-muted">
            Every fragrance, described the honest way — by what’s actually in it.
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-0.5 overflow-hidden rounded-lg bg-line-soft">
          {scents.map((s) => (
            <Link
              key={s.id}
              href={`/products/${s.handle}`}
              className="block bg-paper p-[26px] transition-colors duration-150 hover:bg-hover hover:text-ink"
            >
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-teal">
                  {s.line?.title}
                </span>
                {s.full && <span className="text-sm font-semibold">{formatMoney(s.full.price)}</span>}
              </div>
              <h3 className="mb-1.5 font-serif text-[26px] font-normal leading-tight">{s.title}</h3>
              <p className="text-sm leading-normal text-muted">{s.shortNotes}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Refill band */}
      <section className="bg-teal px-page py-20 text-center text-teal-ink">
        <h2 className="mx-auto mb-5 max-w-[760px] font-serif text-[clamp(38px,4vw,52px)] font-normal leading-[1.05]">
          Buy the bottle once. <em>Refill it forever.</em>
        </h2>
        <p className="mx-auto mb-[30px] max-w-[560px] text-lg leading-[1.6] opacity-90">
          Refills from £6, posted flat through your letterbox. Keep the glass and the wood you
          already own — long-lasting by design, low-waste by default.
        </p>
        <Link href="/shop/refills" className={btnOnTeal}>
          Shop refills
        </Link>
      </section>
    </div>
  )
}
