"use client"

import { useState } from "react"
import { formatMoney } from "@/lib/money"
import type { Scent, VariantKind } from "@/lib/types"
import { useCart } from "../cart/CartProvider"
import { QtyStepper } from "../ui/QtyStepper"
import { Spinner } from "../ui/Spinner"
import { Accordion } from "./Accordion"

const INTERVALS = [4, 6, 8]
const DEFAULT_WEEKS = 6
/** Display only — the backend sets the real subscriber price. */
const subscriberPrice = (price: number) => Math.round(price * 0.95 * 100) / 100

function PurchaseOption({
  checked,
  onSelect,
  title,
  price,
  wasPrice,
  children,
}: {
  checked: boolean
  onSelect: () => void
  title: string
  price: number
  wasPrice?: number
  children?: React.ReactNode
}) {
  return (
    <div
      className={`rounded-[10px] border-[1.5px] bg-paper p-4 text-ink transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-teal ${
        checked ? "border-ink" : "border-line hover:border-input-border"
      }`}
    >
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <input type="radio" name="purchase" checked={checked} onChange={onSelect} className="h-4 w-4 accent-teal" />
          <span className="text-[15px] font-semibold">{title}</span>
        </span>
        <span className="text-[15px] font-semibold">
          {wasPrice != null && (
            <span className="mr-2 text-[13px] font-normal text-muted line-through">{formatMoney(wasPrice)}</span>
          )}
          {formatMoney(price)}
        </span>
      </label>
      {children && <div className={checked ? "" : "opacity-70"}>{children}</div>}
    </div>
  )
}

export function BuyBox({
  scent,
  initialVariant,
}: {
  scent: Scent
  initialVariant: VariantKind
}) {
  const { addItem, addSubscription, openDrawer } = useCart()
  const [kind, setKind] = useState<VariantKind>(
    initialVariant === "refill" && scent.refill ? "refill" : "full"
  )
  const [qty, setQty] = useState(1)
  const [subscribe, setSubscribe] = useState(false)
  const [weeks, setWeeks] = useState<number>(DEFAULT_WEEKS)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const line = scent.line
  const format = line?.format ?? "Full"
  const variant = kind === "refill" ? scent.refill : scent.full
  const isSubscription = kind === "refill" && subscribe
  const refillPrice = scent.refill?.price ?? 0
  const unit = isSubscription ? subscriberPrice(refillPrice) : (variant?.price ?? 0)

  async function onAdd() {
    if (!variant) return
    setAdding(true)
    setError(null)
    const ok = isSubscription
      ? await addSubscription(variant.id, qty, weeks)
      : await addItem(variant.id, qty)
    setAdding(false)
    if (ok) {
      openDrawer()
      setQty(1)
    } else {
      setError("We couldn’t add that to your bag. Please try again.")
    }
  }

  const options: { kind: VariantKind; title: string; sub: string; price?: number }[] = [
    { kind: "full", title: format, sub: "Vessel + first fill", price: scent.full?.price },
    { kind: "refill", title: "Refill", sub: "Scent only", price: scent.refill?.price },
  ]

  return (
    <div className="lg:sticky lg:top-6">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-teal">
        {line?.title} · {format}
      </div>
      <h1 className="mb-3.5 font-serif text-[clamp(44px,4.4vw,64px)] font-normal leading-none">
        {scent.title}
      </h1>
      <div className="mb-[18px] text-[22px] font-semibold">{formatMoney(unit)}</div>
      <p className="mb-7 text-pretty text-[17px] leading-[1.6] text-ink-2">{scent.description}</p>

      <dl className="mb-7 grid grid-cols-3 border-y border-line">
        {(
          [
            ["Top", scent.notes.top],
            ["Heart", scent.notes.heart],
            ["Base", scent.notes.base],
          ] as const
        ).map(([label, value], i) => (
          <div key={label} className={i === 0 ? "py-4 pr-3" : "border-l border-line px-3 py-4"}>
            <dt className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-2">
              {label}
            </dt>
            <dd className="text-[15px] leading-[1.4]">{value || "—"}</dd>
          </div>
        ))}
      </dl>

      <fieldset className="mb-[22px]">
        <legend className="mb-2.5 text-sm font-semibold">Choose</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {options.map((o) =>
            o.price == null ? null : (
              <label
                key={o.kind}
                className={`cursor-pointer rounded-[10px] border-[1.5px] bg-paper p-4 text-ink transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-teal ${
                  kind === o.kind ? "border-ink" : "border-line hover:border-input-border"
                }`}
              >
                <input
                  type="radio"
                  name="variant"
                  value={o.kind}
                  checked={kind === o.kind}
                  onChange={() => setKind(o.kind)}
                  className="sr-only"
                />
                <div className="text-[15px] font-semibold">{o.title}</div>
                <div className="mt-[3px] text-[13px] text-muted">
                  {o.sub} · {formatMoney(o.price)}
                </div>
              </label>
            )
          )}
        </div>
      </fieldset>

      {kind === "refill" && scent.refill && (
        <fieldset className="mb-[22px]">
          <legend className="mb-2.5 text-sm font-semibold">How would you like it?</legend>
          <div className="grid gap-2.5">
            <PurchaseOption checked={!subscribe} onSelect={() => setSubscribe(false)} title="One-off" price={refillPrice} />
            <PurchaseOption
              checked={subscribe}
              onSelect={() => setSubscribe(true)}
              title="Subscribe & save 5%"
              price={subscriberPrice(refillPrice)}
              wasPrice={refillPrice}
            >
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                <label htmlFor="sub-weeks">Deliver every</label>
                <select
                  id="sub-weeks"
                  value={weeks}
                  onChange={(e) => {
                    setWeeks(Number(e.target.value))
                    setSubscribe(true)
                  }}
                  className="h-9 rounded-full border border-input-border bg-paper px-3 text-[13px] font-semibold text-ink outline-none focus:border-teal"
                >
                  {INTERVALS.map((w) => (
                    <option key={w} value={w}>
                      {w} weeks
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-[13px] leading-normal text-muted">
                Free delivery on every refill. Skip, pause or cancel any time from your account.
              </p>
            </PurchaseOption>
          </div>
        </fieldset>
      )}

      <div className="mb-3.5 flex gap-3">
        <QtyStepper size="lg" min={1} value={qty} onChange={(q) => setQty(Math.max(1, q))} />
        <button
          type="button"
          onClick={onAdd}
          disabled={adding || !variant}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-4 text-base font-semibold text-paper transition-colors duration-200 hover:bg-teal disabled:opacity-70"
        >
          {adding && <Spinner />}
          {isSubscription ? "Subscribe" : "Add to bag"} — {formatMoney(unit * qty)}
        </button>
      </div>
      {error && (
        <p role="alert" className="mb-3 text-[13px] text-danger">
          {error}
        </p>
      )}
      <div className="mb-7 text-[13.5px] text-muted">
        {line?.life ? `${line.life} · ` : ""}Free UK delivery over £30
      </div>

      <Accordion
        items={[
          { title: "How to use", body: line?.howToUse || "Instructions coming soon." },
          {
            title: "What’s in it",
            body: 'Perfumer-grade fragrance oils, blended in small batches in the UK. No synthetic "flavour" accords, no parabens, no phthalates.',
          },
          {
            title: "Delivery & refills",
            body: "Free UK delivery over £30, otherwise £3.95. Refills fit through the letterbox, and we’ll remind you when yours is due.",
          },
        ]}
      />
    </div>
  )
}
