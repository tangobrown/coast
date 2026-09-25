import type { Metadata } from "next"
import Link from "next/link"
import { ProductImage } from "@/components/ui/ProductImage"
import { btnPrimary, eyebrow } from "@/components/ui/styles"
import { SITE_IMAGES } from "@/lib/site-images"

export const metadata: Metadata = { title: "Our story" }

const PRINCIPLES = [
  {
    title: "Real notes",
    body: "Every scent is built like fine fragrance — top, heart and base — from perfumer-grade oils, not a single synthetic “flavour”.",
  },
  {
    title: "Made to refill",
    body: "Glass bottles, solid wood, metal clips. You keep them for years and top up the scent — no plastic tree in the bin every month.",
  },
  {
    title: "Built to last",
    body: "Weeks of even, gentle throw rather than a three-day blast that fades to nothing. Quietly there, every time you get in.",
  },
]

export default function OurStoryPage() {
  return (
    <div className="mx-auto max-w-site">
      <section className="px-page pb-[60px] pt-[50px] text-center">
        <div className={`mb-[22px] ${eyebrow}`}>Our story</div>
        <h1 className="mx-auto mb-[26px] max-w-[900px] text-balance font-serif text-[clamp(48px,6vw,88px)] font-normal leading-none">
          We got tired of cars that smell like <em className="text-teal">a lie</em>.
        </h1>
        <p className="mx-auto max-w-[600px] text-pretty text-[19px] leading-[1.55] text-ink-2">
          Cherry that’s never met a cherry. Pine that smells like a service-station loo. Coast
          started with a simple idea: the car deserves the same fragrance you’d wear.
        </p>
      </section>

      <div className="px-page">
        <ProductImage
          src={SITE_IMAGES.storyHero}
          alt="Blending fragrance in the Coast studio"
          label="Founders / studio / blending"
          sizes="100vw"
          className="h-[clamp(300px,40vw,560px)] rounded-[10px]"
        />
      </div>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-10 px-page py-20">
        {PRINCIPLES.map((p, i) => (
          <div key={p.title} className="border-t border-line pt-6">
            <div className="mb-3.5 font-serif text-[52px] leading-none text-numeral">
              {String(i + 1).padStart(2, "0")}
            </div>
            <h3 className="mb-2.5 font-serif text-[32px] font-normal leading-[1.05]">{p.title}</h3>
            <p className="text-base leading-[1.6] text-ink-2">{p.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-page mb-20 grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] overflow-hidden rounded-[10px] bg-paper">
        <ProductImage
          src={SITE_IMAGES.storyRefill}
          alt="Refilling a Coast bottle"
          label="Refill process"
          sizes="(min-width: 768px) 50vw, 100vw"
          className="min-h-[380px]"
        />
        <div className="flex flex-col justify-center gap-[18px] p-[clamp(28px,4vw,60px)]">
          <h2 className="font-serif text-[42px] font-normal leading-[1.05]">
            Smell something real on your next drive.
          </h2>
          <p className="text-[17px] leading-[1.6] text-ink-2">
            Three formats, one standard. Start with the one that suits your car.
          </p>
          <div>
            <Link href="/shop" className={`${btnPrimary} px-[34px]`}>
              Shop all scents
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
