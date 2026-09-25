"use client"

import Link from "next/link"
import { formatMoney, freeShippingProgress } from "@/lib/money"
import { FreeShippingBar } from "../ui/FreeShippingBar"
import { ProductImage } from "../ui/ProductImage"
import { QtyStepper } from "../ui/QtyStepper"
import { btnPrimary } from "../ui/styles"
import { useCart } from "./CartProvider"

const STANDARD_DELIVERY = 3.95

export function BagPage() {
  const { cart, updateItem, removeItem, error } = useCart()
  const items = cart?.items ?? []
  const subtotal = cart?.subtotal ?? 0
  const { unlocked } = freeShippingProgress(subtotal)
  // Estimate shown before a delivery method is chosen at checkout.
  const delivery = unlocked ? 0 : STANDARD_DELIVERY

  return (
    <div className="mx-auto max-w-[1200px] px-page pb-[90px] pt-[30px]">
      <h1 className="mb-[30px] font-serif text-[clamp(48px,5vw,72px)] font-normal leading-none">
        Your bag
      </h1>

      {items.length === 0 ? (
        <div className="rounded-[10px] bg-paper px-[30px] py-[70px] text-center">
          <p className="mb-2.5 font-serif text-[32px]">Nothing in here yet.</p>
          <p className="mb-[26px] text-muted">
            Start with a best-seller — or take a look at every scent.
          </p>
          <Link href="/shop" className={`${btnPrimary} px-[34px] py-[15px] text-[15px]`}>
            Shop all scents
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-10">
          <div className="min-w-0 flex-[1_1_520px]">
            <div className="mb-[22px] rounded-[10px] bg-paper px-[22px] py-[18px]">
              <FreeShippingBar subtotal={subtotal} size="md" />
            </div>
            <ul >
              {items.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[90px_minmax(0,1fr)_auto] items-start gap-[22px] border-b border-line py-[22px] sm:grid-cols-[120px_minmax(0,1fr)_auto]"
                >
                  <ProductImage
                    src={item.thumbnail}
                    alt={item.title}
                    sizes="120px"
                    className="aspect-[4/5] rounded-lg"
                  />
                  <div>
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-teal">
                      {item.lineTitle}
                    </div>
                    <h3 className="mb-1 font-serif text-[26px] font-normal leading-tight">
                      <Link href={`/products/${item.productHandle}`}>{item.title}</Link>
                    </h3>
                    <div className="mb-4 text-sm text-muted">
                      {item.variantLabel} · {formatMoney(item.unitPrice)}
                    </div>
                    <div className="flex items-center gap-4">
                      <QtyStepper
                        value={item.quantity}
                        label={`Quantity of ${item.title}`}
                        onChange={(q) => updateItem(item.id, q)}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-sm text-muted underline hover:text-teal"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-base font-semibold">{formatMoney(item.total)}</div>
                </li>
              ))}
            </ul>
            {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
            <div className="mt-[22px]">
              <Link href="/shop" className="text-[15px] font-semibold text-teal">
                ← Continue shopping
              </Link>
            </div>
          </div>

          <aside className="w-full max-w-[420px] flex-[1_1_320px] rounded-[10px] bg-paper p-7 lg:sticky lg:top-6">
            <h2 className="mb-5 font-serif text-[30px] font-normal">Summary</h2>
            <div className="mb-2.5 flex justify-between text-[15px]">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="mb-2.5 flex justify-between text-[15px] text-ink-2">
              <span>Delivery</span>
              <span>{delivery === 0 ? "Free" : formatMoney(delivery)}</span>
            </div>
            <div className="mt-4 flex justify-between border-t border-line pt-4 text-lg font-semibold">
              <span>Total</span>
              <span>{formatMoney(subtotal + delivery)}</span>
            </div>
            <Link href="/checkout" className={`${btnPrimary} mt-[22px] h-14 w-full py-0`}>
              Checkout
            </Link>
            <p className="mt-3.5 text-center text-[13px] leading-normal text-muted">
              Refill reminders sent when your scent’s running low. Unsubscribe any time.
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}
