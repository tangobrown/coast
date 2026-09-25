"use client"

import { useState, useTransition } from "react"
import { applyPromoCode, removePromoCode } from "@/lib/cart"
import { formatMoney } from "@/lib/money"
import { useCart } from "../cart/CartProvider"
import { ProductImage } from "../ui/ProductImage"

export function OrderSummary() {
  const { cart, setCart } = useCart()
  const [code, setCode] = useState("")
  const [promoError, setPromoError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  if (!cart) return null

  const hasShipping = !!cart.shippingOptionId

  function apply(e: React.FormEvent) {
    e.preventDefault()
    setPromoError(null)
    startTransition(async () => {
      const res = await applyPromoCode(code)
      if (res.ok) {
        setCart(res.data)
        setCode("")
      } else {
        setPromoError(res.error)
      }
    })
  }

  function remove(c: string) {
    startTransition(async () => {
      const res = await removePromoCode(c)
      if (res.ok) setCart(res.data)
    })
  }

  return (
    <aside className="w-full max-w-[440px] flex-[1_1_340px] rounded-[10px] bg-paper p-7 lg:sticky lg:top-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left lg:hidden"
      >
        <span className="font-serif text-[24px]">{open ? "Hide" : "Show"} order summary</span>
        <span className="text-[17px] font-semibold">{formatMoney(cart.total)}</span>
      </button>

      <div className={`${open ? "mt-5 block" : "hidden"} lg:mt-0 lg:block`}>
        <h2 className="mb-[18px] hidden font-serif text-[28px] font-normal lg:block">Order summary</h2>
        <ul className="mb-5 grid gap-3.5">
          {cart.items.map((item) => (
            <li key={item.id} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3.5">
              <div className="relative h-16 w-16">
                <ProductImage src={item.thumbnail} alt={item.title} sizes="64px" className="h-16 w-16 rounded-lg" />
                <span className="absolute -right-[7px] -top-[7px] flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-teal px-1 text-[11px] font-bold text-teal-ink">
                  {item.quantity}
                </span>
              </div>
              <div>
                <div className="text-[15px] font-semibold">{item.title}</div>
                <div className="text-[13px] text-muted">
                  {item.lineTitle} · {item.variantLabel}
                </div>
              </div>
              <div className="text-[15px] font-semibold">{formatMoney(item.total)}</div>
            </li>
          ))}
        </ul>

        <form onSubmit={apply} className="border-y border-line py-[18px]">
          <div className="flex gap-2">
            <label htmlFor="promo" className="sr-only">
              Discount code
            </label>
            <input
              id="promo"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Discount code"
              className="h-[46px] min-w-0 flex-1 rounded-lg border border-input-border bg-paper px-3.5 text-sm outline-none focus:border-teal"
            />
            <button
              type="submit"
              disabled={pending || !code.trim()}
              className="h-[46px] rounded-lg border border-ink bg-transparent px-5 text-sm font-semibold text-ink transition-colors hover:border-teal hover:text-teal disabled:opacity-50"
            >
              Apply
            </button>
          </div>
          {promoError && <p className="mt-2 text-[13px] text-danger">{promoError}</p>}
          {cart.promoCodes.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {cart.promoCodes.map((c) => (
                <li
                  key={c}
                  className="flex items-center gap-2 rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-teal"
                >
                  {c}
                  <button type="button" onClick={() => remove(c)} aria-label={`Remove code ${c}`}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        <div className="mb-2.5 mt-[18px] flex justify-between text-[15px]">
          <span>Subtotal</span>
          <span>{formatMoney(cart.subtotal)}</span>
        </div>
        {cart.discountTotal > 0 && (
          <div className="mb-2.5 flex justify-between text-[15px] text-teal">
            <span>Discount</span>
            <span>−{formatMoney(cart.discountTotal)}</span>
          </div>
        )}
        <div className="mb-2.5 flex justify-between text-[15px] text-ink-2">
          <span>Delivery</span>
          <span>
            {!hasShipping ? "—" : cart.shippingTotal === 0 ? "Free" : formatMoney(cart.shippingTotal)}
          </span>
        </div>
        <div className="mt-4 flex justify-between border-t border-line pt-4 text-[19px] font-semibold">
          <span>Total</span>
          <span>{formatMoney(cart.total)}</span>
        </div>
      </div>
    </aside>
  )
}
