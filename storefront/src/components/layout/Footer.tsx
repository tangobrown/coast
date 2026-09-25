import Link from "next/link"
import { NAV_LINKS } from "./nav"

export function Footer() {
  return (
    <footer className="mx-auto flex max-w-site flex-wrap items-end justify-between gap-[30px] border-t border-line px-page py-14 text-ink-2">
      <div>
        <div className="mb-2.5 font-serif text-4xl text-ink">Coast</div>
        <p className="m-0 max-w-[280px] text-sm leading-normal">
          Real fragrance for the car. Made in the UK, built to be refilled.
        </p>
      </div>
      <nav aria-label="Footer" className="flex flex-wrap gap-[26px] text-sm font-medium">
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="text-ink">
            {l.label}
          </Link>
        ))}
        <Link href="/cart" className="text-ink">
          Bag
        </Link>
      </nav>
      <div className="text-[13px] opacity-70">© {new Date().getFullYear()} Coast Fragrances</div>
    </footer>
  )
}
