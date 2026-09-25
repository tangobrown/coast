"use client"

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { finishCardUpdate, startCardUpdate } from "@/lib/subscriptions"
import { appearance, getStripe } from "../checkout/StripeParts"
import { Spinner } from "../ui/Spinner"
import { btnSecondary } from "../ui/styles"

/** "Update card" for subscriptions: Stripe Payment Element in setup mode. */
export function CardUpdate({ stripeKey }: { stripeKey: string | null }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!stripeKey) return null

  async function open() {
    setLoading(true)
    setError(null)
    const res = await startCardUpdate()
    setLoading(false)
    if (res.ok) setClientSecret(res.data.clientSecret)
    else setError(res.error)
  }

  if (!clientSecret) {
    return (
      <div>
        <button type="button" onClick={open} disabled={loading} className={`${btnSecondary} h-[46px] px-6 py-0 text-sm`}>
          {loading && <Spinner />}
          Update card
        </button>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>
    )
  }

  return (
    <Elements stripe={getStripe(stripeKey)} options={{ clientSecret, appearance }}>
      <CardForm onCancel={() => setClientSecret(null)} />
    </Elements>
  )
}

function CardForm({ onCancel }: { onCancel: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setSaving(true)
    setError(null)
    const { error: stripeError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: `${window.location.origin}/account/subscriptions` },
      redirect: "if_required",
    })
    if (stripeError || !setupIntent) {
      setError(stripeError?.message ?? "That card couldn’t be saved.")
      setSaving(false)
      return
    }
    const res = await finishCardUpdate(setupIntent.id)
    setSaving(false)
    if (!res.ok) return setError(res.error)
    setMessage(res.data.retried ? "Card updated — your refill is on its way." : "Card updated.")
    router.refresh()
  }

  if (message) return <p className="text-sm font-semibold text-teal">{message}</p>

  return (
    <form onSubmit={save} className="grid gap-4 rounded-[10px] border border-line p-4">
      <PaymentElement options={{ layout: { type: "tabs" }, wallets: { applePay: "never", googlePay: "never" } }} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving || !stripe}
          className="flex h-[46px] items-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-paper hover:bg-teal disabled:opacity-60"
        >
          {saving && <Spinner />}
          Save card
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-muted underline">
          Cancel
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </form>
  )
}
