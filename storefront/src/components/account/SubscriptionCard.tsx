"use client"

import { useState, useTransition } from "react"
import { changeSubscription, type SubscriptionAction } from "@/lib/subscriptions"
import { formatDate } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import type { SubscriptionView } from "@/lib/types"
import { Spinner } from "../ui/Spinner"
import { CardUpdate } from "./CardUpdate"

export type RefillChoice = { variantId: string; title: string; lineTitle: string }


const STATUS: Record<SubscriptionView["status"], { label: string; className: string }> = {
  active: { label: "Active", className: "bg-teal/10 text-teal" },
  paused: { label: "Paused", className: "bg-stone text-ink-2" },
  payment_failed: { label: "Payment needed", className: "bg-danger/10 text-danger" },
  cancelled: { label: "Cancelled", className: "bg-stone text-muted" },
}

const selectClass =
  "h-10 rounded-full border border-input-border bg-paper px-3 text-sm font-semibold text-ink outline-none focus:border-teal disabled:opacity-60"
const linkButton = "text-sm font-semibold text-ink underline decoration-line underline-offset-4 hover:text-teal disabled:opacity-50"

export function SubscriptionCard({
  initial,
  refills,
  stripeKey,
}: {
  initial: SubscriptionView
  refills: RefillChoice[]
  stripeKey: string | null
}) {
  const [sub, setSub] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [pending, startTransition] = useTransition()

  function run(change: SubscriptionAction) {
    setError(null)
    startTransition(async () => {
      const res = await changeSubscription(sub.id, change)
      if (res.ok) {
        setSub(res.data)
        setConfirmCancel(false)
      } else {
        setError(res.error)
      }
    })
  }

  const status = STATUS[sub.status]
  const live = sub.status === "active" || sub.status === "payment_failed"
  const next = formatDate(sub.nextChargeAt, true)

  return (
    <article className={`rounded-[10px] bg-paper p-6 transition-opacity sm:p-7 ${pending ? "opacity-70" : ""}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-teal">
            {sub.lineTitle ? `${sub.lineTitle} refill` : "Refill"}
          </div>
          <h3 className="font-serif text-[30px] font-normal leading-tight">{sub.productTitle}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] ${status.className}`}>
          {status.label}
        </span>
      </div>

      <p className="mb-5 text-[15px] leading-[1.6] text-ink-2">
        {sub.subscriptionPrice != null && (
          <>
            <strong className="text-ink">{formatMoney(sub.subscriptionPrice * sub.quantity)}</strong>
            {sub.price != null && (
              <span className="ml-1.5 text-muted line-through">{formatMoney(sub.price * sub.quantity)}</span>
            )}{" "}
            ·{" "}
          </>
        )}
        {sub.quantity > 1 && `${sub.quantity} refills · `}every {sub.intervalWeeks} weeks · free delivery
        <br />
        {sub.status === "active" && <>Next refill: <strong className="text-ink">{next}</strong></>}
        {sub.status === "paused" && "Paused — no refills will be sent until you resume."}
        {sub.status === "cancelled" && "Cancelled — you won’t be charged again."}
        {sub.status === "payment_failed" && <>Waiting on payment for the refill due {next}.</>}
      </p>

      {sub.status === "payment_failed" && (
        <div className="mb-5 grid gap-3 rounded-[10px] border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm leading-[1.6] text-ink-2">
            We couldn’t take payment{sub.lastFailureReason ? ` (${sub.lastFailureReason})` : ""}. Update your
            card, or try again if you’ve sorted it with your bank.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <CardUpdate stripeKey={stripeKey} />
            <button type="button" className={linkButton} disabled={pending} onClick={() => run({ action: "retry" })}>
              Retry payment
            </button>
          </div>
        </div>
      )}

      {sub.status !== "cancelled" && (
        <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <label className="grid gap-1.5 text-[13px] text-muted">
            Scent
            <select
              className={selectClass}
              value={sub.variantId}
              disabled={pending}
              onChange={(e) => run({ action: "update", variant_id: e.target.value })}
            >
              {!refills.some((r) => r.variantId === sub.variantId) && (
                <option value={sub.variantId}>{sub.productTitle}</option>
              )}
              {refills.map((r) => (
                <option key={r.variantId} value={r.variantId}>
                  {r.title} ({r.lineTitle})
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-[13px] text-muted">
            Deliver every
            <select
              className={selectClass}
              value={sub.intervalWeeks}
              disabled={pending}
              onChange={(e) => run({ action: "update", interval_weeks: Number(e.target.value) })}
            >
              {[4, 6, 8].map((w) => (
                <option key={w} value={w}>
                  {w} weeks
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        {sub.status === "active" && (
          <button type="button" className={linkButton} disabled={pending} onClick={() => run({ action: "skip" })}>
            Skip next refill
          </button>
        )}
        {live && (
          <button type="button" className={linkButton} disabled={pending} onClick={() => run({ action: "pause" })}>
            Pause
          </button>
        )}
        {(sub.status === "paused" || sub.status === "cancelled") && (
          <button type="button" className={linkButton} disabled={pending} onClick={() => run({ action: "resume" })}>
            {sub.status === "cancelled" ? "Restart subscription" : "Resume"}
          </button>
        )}
        {sub.status !== "cancelled" &&
          (confirmCancel ? (
            <span className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-ink-2">Cancel this subscription?</span>
              <button type="button" className={`${linkButton} text-danger`} disabled={pending} onClick={() => run({ action: "cancel" })}>
                Yes, cancel
              </button>
              <button type="button" className={linkButton} onClick={() => setConfirmCancel(false)}>
                Keep it
              </button>
            </span>
          ) : (
            <button type="button" className={`${linkButton} text-muted`} onClick={() => setConfirmCancel(true)}>
              Cancel subscription
            </button>
          ))}
        {pending && <Spinner className="text-muted" />}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      {(sub.status === "active" || sub.status === "paused") && stripeKey && (
        <div className="mt-5 grid gap-2 border-t border-line pt-5">
          {!sub.hasCard && (
            <p className="text-[13px] text-muted">No saved card yet — add one before your next refill.</p>
          )}
          <CardUpdate stripeKey={stripeKey} />
        </div>
      )}
    </article>
  )
}
