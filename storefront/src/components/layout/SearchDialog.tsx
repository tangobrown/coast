"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { formatMoney } from "@/lib/money"
import { searchItems, type SearchItem } from "@/lib/search"
import { ProductImage } from "../ui/ProductImage"

const SUGGESTIONS = ["Cedar", "Fig", "Sea salt", "Bergamot", "Amber"]

export function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

export function SearchDialog({
  open,
  onClose,
  items,
}: {
  open: boolean
  onClose: () => void
  items: SearchItem[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const results = useMemo(() => searchItems(items, query), [items, query])

  // Close when navigating to a result.
  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const { overflow } = document.body.style
    document.body.style.overflow = "hidden"
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  if (!open) return null

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    // A single match goes straight to the product.
    router.push(results.length === 1 ? `/products/${results[0].handle}` : `/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="fixed inset-0 z-[110]">
      <div onClick={onClose} className="absolute inset-0 bg-[rgba(32,29,26,.35)]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search scents"
        className="relative mx-auto max-h-[85vh] w-full max-w-[760px] overflow-auto bg-paper shadow-drawer sm:mt-16 sm:rounded-[10px]"
      >
        <form onSubmit={submit} role="search" className="flex items-center gap-3 border-b border-line-soft px-5 py-4 sm:px-7">
          <SearchIcon className="shrink-0 text-muted" />
          <label htmlFor="site-search" className="sr-only">
            Search scents
          </label>
          <input
            ref={inputRef}
            id="site-search"
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by scent or note — try “fig”"
            autoComplete="off"
            className="h-12 min-w-0 flex-1 bg-transparent font-serif text-[26px] text-ink outline-none placeholder:text-muted-2 [&::-webkit-search-cancel-button]:hidden"
          />
          <button type="button" onClick={onClose} aria-label="Close search" className="h-11 w-11 shrink-0 text-[26px] text-ink hover:text-teal">
            ×
          </button>
        </form>

        <div className="px-5 py-4 sm:px-7" aria-live="polite">
          {!query.trim() ? (
            <div className="py-2">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-2">Popular notes</div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuery(s)}
                    className="rounded-full border border-ink px-4 py-2 text-sm font-semibold transition-colors hover:bg-ink hover:text-paper"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center">
              <p className="mb-2 font-serif text-[24px]">Nothing matches “{query.trim()}”.</p>
              <Link href="/shop" className="text-[15px] font-semibold text-teal">
                Browse all scents →
              </Link>
            </div>
          ) : (
            <ul className="grid">
              {results.map((r) => (
                <li key={r.handle}>
                  <Link
                    href={`/products/${r.handle}`}
                    className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-hover hover:text-ink"
                  >
                    <ProductImage src={r.thumbnail} alt="" sizes="56px" className="aspect-[4/5] rounded-md" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-teal">{r.line}</div>
                      <div className="font-serif text-[22px] leading-tight">{r.title}</div>
                      <div className="truncate text-[13px] text-muted">{r.notes}</div>
                    </div>
                    {r.price != null && <div className="text-[15px] font-semibold">{formatMoney(r.price)}</div>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
