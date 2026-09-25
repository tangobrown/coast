"use client"

import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js"
import { useEffect, useMemo } from "react"
import type { StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js"
import type { ShippingOptionView } from "@/lib/types"

export const STRIPE_PROVIDER_ID = "pp_stripe_stripe"

export const toPence = (amount: number) => Math.round(amount * 100)

const stripePromises = new Map<string, Promise<Stripe | null>>()
function getStripe(key: string) {
  if (!stripePromises.has(key)) stripePromises.set(key, loadStripe(key))
  return stripePromises.get(key)!
}

// Brand styling for Stripe's iframes, from the design handoff.
const appearance = {
  theme: "flat" as const,
  variables: {
    colorPrimary: "#2E4B4E",
    colorBackground: "#FBF9F5",
    colorText: "#201D1A",
    colorDanger: "#9A3B2E",
    fontFamily: "Hanken Grotesk, sans-serif",
    borderRadius: "8px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": { border: "1px solid #CFC7B7", padding: "15px 16px" },
    ".Input:focus": { borderColor: "#2E4B4E", boxShadow: "none" },
  },
}

/**
 * Deferred-intent Elements: the Payment Element renders straight away using
 * the cart total, and the PaymentIntent is only created when the shopper pays.
 */
export function StripeProvider({
  publishableKey,
  amount,
  children,
}: {
  publishableKey: string
  amount: number
  children: React.ReactNode
}) {
  const stripePromise = useMemo(() => getStripe(publishableKey), [publishableKey])
  return (
    <Elements
      stripe={stripePromise}
      options={{
        mode: "payment",
        amount: Math.max(toPence(amount), 30),
        currency: "gbp",
        appearance,
        fonts: [
          {
            cssSrc:
              "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&display=swap",
          },
        ],
      }}
    >
      {children}
    </Elements>
  )
}

export type StripeHandles = { stripe: Stripe | null; elements: StripeElements | null }

/** Hands the Stripe instances up to the (non-Stripe-aware) checkout form. */
export function StripeBridge({ onReady }: { onReady: (h: StripeHandles) => void }) {
  const stripe = useStripe()
  const elements = useElements()
  useEffect(() => onReady({ stripe, elements }), [stripe, elements, onReady])
  return null
}

export function CardPayment() {
  return (
    <PaymentElement
      options={{
        layout: { type: "tabs" },
        // Wallets live in the Express checkout row above.
        wallets: { applePay: "never", googlePay: "never" },
        // We already collect these in the form and pass them on confirm.
        fields: { billingDetails: { email: "never", phone: "never", address: "never" } },
      }}
    />
  )
}

export function ExpressCheckout({
  shippingOptions,
  onShippingRateChange,
  onConfirm,
  onAvailable,
}: {
  shippingOptions: ShippingOptionView[]
  onShippingRateChange: (optionId: string) => Promise<boolean>
  onConfirm: (event: StripeExpressCheckoutElementConfirmEvent) => Promise<void>
  onAvailable: (available: boolean) => void
}) {
  const rates = shippingOptions.map((o) => ({
    id: o.id,
    amount: toPence(o.amount),
    displayName: o.description ? `${o.name} (${o.description})` : o.name,
  }))

  return (
    <ExpressCheckoutElement
      options={{
        buttonHeight: 50,
        buttonTheme: { applePay: "black", googlePay: "black" },
        layout: { maxColumns: 2, maxRows: 1, overflow: "never" },
        emailRequired: true,
        phoneNumberRequired: true,
        shippingAddressRequired: true,
        allowedShippingCountries: ["GB"],
        paymentMethods: { link: "never", paypal: "never", amazonPay: "never", klarna: "never" },
      }}
      onReady={({ availablePaymentMethods }) => onAvailable(!!availablePaymentMethods)}
      onClick={(event) => event.resolve({ shippingRates: rates })}
      onShippingAddressChange={(event) => {
        if (event.address.country && event.address.country !== "GB") {
          event.reject()
        } else {
          event.resolve()
        }
      }}
      onShippingRateChange={async (event) => {
        const ok = await onShippingRateChange(event.shippingRate.id)
        if (ok) event.resolve()
        else event.reject()
      }}
      onConfirm={onConfirm}
    />
  )
}
