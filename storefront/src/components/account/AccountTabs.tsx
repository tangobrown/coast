"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const TABS = [
  { href: "/account", label: "Orders" },
  { href: "/account/subscriptions", label: "Subscriptions" },
  { href: "/account/details", label: "Details" },
]

export function AccountTabs() {
  const pathname = usePathname()
  return (
    <nav aria-label="Account" className="flex flex-wrap gap-2">
      {TABS.map((t) => {
        const active = pathname === t.href
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full border border-ink px-5 py-2.5 text-sm font-semibold transition-colors duration-150 ${
              active ? "bg-ink text-paper hover:text-paper" : "bg-transparent text-ink hover:bg-ink/5"
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
