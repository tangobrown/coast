"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { formatMoney } from "@/lib/money"
import { FreeShippingBar } from "../ui/FreeShippingBar"
import { ProductImage } from "../ui/ProductImage"
import { QtyStepper } from "../ui/QtyStepper"
import { btnPrimary, btnSecondary } from "../ui/styles"
import { useCart } from "./CartProvider"

export function CartDrawer() {
  const { cart, drawerOpen, closeDrawer, updateItem, removeItem, error } = useCart()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()
  const items = cart?.items ?? []
  const count = cart?.itemCount ?? 0

  // Close on navigation.
  useEffect(() => {
    closeDrawer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Esc to close, focus trap, body scroll lock.
  useEffect(() => {
    if (!drawerOpen) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = "hidden"
    closeRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDrawer()
        return
      }
      if (e.key !== "Tab" || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
      previouslyFocused?.focus?.()
    }
  }, [drawerOpen, closeDrawer])

  return (
    <div
      className={`fixed inset-0 z-[100] ${drawerOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!drawerOpen}
      inert={!drawerOpen}
    >
      <div
        onClick={closeDrawer}
        className={`absolute inset-0 bg-[rgba(32,29,26,.35)] transition-opacity duration-250 ease-out ${drawerOpen ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className={`absolute inset-y-0 right-0 flex w-[min(440px,100%)] flex-col bg-paper shadow-drawer transition-[transform,visibility] duration-250 ease-out ${drawerOpen ? "visible translate-x-0" : "invisible translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-line-soft px-[26px] py-[22px]">
          <h2 id="cart-drawer-title" className="font-serif text-[28px] font-normal">
            Your bag ({count})
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={closeDrawer}
            aria-label="Close bag"
            className="h-11 w-11 text-[26px] text-ink transition-colors hover:text-teal"
          >
            ×
          </button>
        </div>

        <div className="border-b border-line-soft px-[26px] py-4">
          <FreeShippingBar subtotal={cart?.subtotal ?? 0} />
        </div>

        <div className={`flex-1 overflow-auto px-[26px] py-1.5 transition-opacity`}>
          {items.length === 0 ? (
            <p className="py-10 text-center text-muted">Your bag is empty.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[80px_minmax(0,1fr)_auto] gap-4 border-b border-line-soft py-[18px]"
                >
                  <ProductImage
                    src={item.thumbnail}
                    alt={item.title}
                    sizes="80px"
                    className="aspect-[4/5] rounded-md"
                  />
                  <div>
                    <Link href={`/products/${item.productHandle}`} className="text-[15px] font-semibold">
                      {item.title}
                    </Link>
                    <div className="mb-2.5 mt-0.5 text-[13px] text-muted">
                      {item.lineTitle} · {item.variantLabel}
                    </div>
                    <div className="flex items-center gap-3">
                      <QtyStepper
                        size="sm"
                        value={item.quantity}
                        label={`Quantity of ${item.title}`}
                        onChange={(q) => updateItem(item.id, q)}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-[13px] text-muted underline hover:text-teal"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-[15px] font-semibold">{formatMoney(item.total)}</div>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="py-3 text-[13px] text-danger">{error}</p>}
        </div>

        <div className="grid gap-2.5 border-t border-line-soft px-[26px] py-[22px]">
          <div className="mb-1.5 flex justify-between text-base font-semibold">
            <span>Subtotal</span>
            <span>{formatMoney(cart?.subtotal ?? 0)}</span>
          </div>
          {items.length > 0 ? (
            <Link href="/checkout" className={`${btnPrimary} h-[54px] py-0`}>
              Checkout
            </Link>
          ) : (
            <Link href="/shop" className={`${btnPrimary} h-[54px] py-0`}>
              Shop all scents
            </Link>
          )}
          <Link href="/cart" className={`${btnSecondary} h-[50px] py-0`}>
            View bag
          </Link>
        </div>
      </div>
    </div>
  )
}
