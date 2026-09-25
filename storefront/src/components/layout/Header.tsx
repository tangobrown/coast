"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useCart } from "../cart/CartProvider"
import { NAV_LINKS } from "./nav"

export function Header() {
  const { cart, openDrawer } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const count = cart?.itemCount ?? 0

  useEffect(() => setMenuOpen(false), [pathname])

  return (
    <header className="mx-auto flex max-w-site flex-wrap items-center justify-between gap-[18px] px-page py-[26px]">
      <Link href="/" className="font-serif text-[32px] leading-none">
        Coast
      </Link>

      <nav aria-label="Main" className="hidden flex-wrap items-center gap-[30px] text-[15px] font-medium md:flex">
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-[22px] text-[15px] font-medium">
        <Link href="/shop" className="hidden sm:inline">
          Shop all
        </Link>
        <button
          type="button"
          onClick={openDrawer}
          className="font-medium transition-colors hover:text-teal"
          aria-haspopup="dialog"
        >
          Bag ({count})
        </button>
        <button
          type="button"
          className="font-medium transition-colors hover:text-teal md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </div>

      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Mobile"
          className="w-full rounded-[10px] bg-paper p-6 md:hidden"
        >
          <ul className="grid gap-1">
            {[{ href: "/shop", label: "Shop all" }, ...NAV_LINKS].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block py-2 font-serif text-[28px] leading-tight">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
