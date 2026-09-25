"use client"

import type { StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  completeCart,
  initiatePayment,
  saveCheckoutDetails,
  setShippingMethod,
  type CheckoutDetails,
} from "@/lib/cart"
import { formatMoney } from "@/lib/money"
import type { Address, ShippingOptionView } from "@/lib/types"
import { EMPTY_ADDRESS, validateAddress, validateEmail, type FieldErrors } from "@/lib/validation"
import { useCart } from "../cart/CartProvider"
import { Spinner } from "../ui/Spinner"
import { Checkbox, Field, SectionHeading } from "./Field"
import { OrderSummary } from "./OrderSummary"
import {
  CardPayment,
  ExpressCheckout,
  STRIPE_PROVIDER_ID,
  StripeBridge,
  StripeProvider,
  toPence,
  type StripeHandles,
} from "./StripeParts"

type Props = {
  shippingOptions: ShippingOptionView[]
  stripeKey: string | null
  allowTestOrders: boolean
}

export function CheckoutClient(props: Props) {
  const { cart } = useCart()
  const total = cart?.total ?? 0
  if (props.stripeKey) {
    return (
      <StripeProvider publishableKey={props.stripeKey} amount={total}>
        <CheckoutForm {...props} />
      </StripeProvider>
    )
  }
  return <CheckoutForm {...props} />
}

function CheckoutForm({ shippingOptions, stripeKey, allowTestOrders }: Props) {
  const router = useRouter()
  const { cart, setCart } = useCart()
  const stripeRef = useRef<StripeHandles>({ stripe: null, elements: null })
  const onStripeReady = useCallback((h: StripeHandles) => {
    stripeRef.current = h
  }, [])

  const [email, setEmail] = useState(cart?.email ?? "")
  const [refillReminders, setRefillReminders] = useState(cart?.refillReminders ?? true)
  const [address, setAddress] = useState<Address>({ ...EMPTY_ADDRESS, ...cart?.shippingAddress })
  const [billingSame, setBillingSame] = useState(true)
  const [billing, setBilling] = useState<Address>(EMPTY_ADDRESS)
  const [shippingId, setShippingId] = useState<string | null>(
    cart?.shippingOptionId ?? shippingOptions[0]?.id ?? null
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [expressAvailable, setExpressAvailable] = useState(false)
  const [done, setDone] = useState(false)

  const paymentsEnabled = !!stripeKey
  const canPay = paymentsEnabled || allowTestOrders

  // Pick a delivery method on arrival so the summary shows a real total.
  const chooseShipping = useCallback(
    async (id: string) => {
      setShippingId(id)
      const res = await setShippingMethod(id)
      if (res.ok) {
        setCart(res.data)
        stripeRef.current.elements?.update({ amount: Math.max(toPence(res.data.total), 30) })
      }
      return res.ok
    },
    [setCart]
  )
  useEffect(() => {
    if (shippingId && cart && cart.shippingOptionId !== shippingId) {
      void chooseShipping(shippingId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (done) {
    return (
      <div className="flex items-center justify-center gap-3 px-page py-32 text-muted">
        <Spinner /> Confirming your order…
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-[760px] px-page py-20 text-center">
        <p className="mb-6 font-serif text-[32px]">Your bag is empty.</p>
        <a href="/shop" className="font-semibold text-teal">
          ← Continue shopping
        </a>
      </div>
    )
  }

  const updateAddress = (patch: Partial<Address>) => setAddress((a) => ({ ...a, ...patch }))
  const updateBilling = (patch: Partial<Address>) => setBilling((a) => ({ ...a, ...patch }))

  function validate(): boolean {
    const e: FieldErrors = { ...validateAddress(address) }
    const emailError = validateEmail(email)
    if (emailError) e.email = emailError
    if (!billingSame) Object.assign(e, validateAddress({ ...billing, phone: "" }, "billing-"))
    if (!shippingId) e.shipping = "Choose a delivery method"
    setErrors(e)
    const first = Object.keys(e)[0]
    if (first) document.getElementById(first)?.focus()
    return !first
  }

  /** Save details → create payment session → confirm → place order. */
  async function placeOrder(
    details: CheckoutDetails,
    optionId: string,
    confirm: (clientSecret: string | null) => Promise<string | null>
  ): Promise<string | null> {
    const saved = await saveCheckoutDetails(details, optionId)
    if (!saved.ok) return saved.error
    setCart(saved.data)

    const session = await initiatePayment(paymentsEnabled ? STRIPE_PROVIDER_ID : "pp_system_default")
    if (!session.ok) return "We couldn’t start the payment. Please try again."

    const confirmError = await confirm(session.data.clientSecret)
    if (confirmError) return confirmError

    const order = await completeCart()
    if (!order.ok) return order.error
    setDone(true)
    setCart(null)
    router.push(`/order/confirmed/${order.data.orderId}`)
    return null
  }

  function billingDetails() {
    const b = billingSame ? address : billing
    return {
      name: `${b.firstName} ${b.lastName}`.trim(),
      email: email.trim(),
      phone: address.phone.trim(),
      address: {
        line1: b.address1.trim(),
        line2: b.address2.trim(),
        city: b.city.trim(),
        state: "",
        postal_code: b.postalCode.trim().toUpperCase(),
        country: "GB",
      },
    }
  }

  async function onPay(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!validate() || !shippingId || !canPay) return
    setPaying(true)

    const { stripe, elements } = stripeRef.current
    if (paymentsEnabled) {
      if (!stripe || !elements) {
        setFormError("Payment form is still loading. Please try again in a moment.")
        setPaying(false)
        return
      }
      const { error } = await elements.submit()
      if (error) {
        setFormError(error.message ?? "Please check your card details.")
        setPaying(false)
        return
      }
    }

    const error = await placeOrder(
      { email, refillReminders, address, billingAddress: billingSame ? undefined : billing },
      shippingId,
      async (clientSecret) => {
        if (!paymentsEnabled) return null
        if (!clientSecret) return "Payment couldn’t be started. Please try again."
        const result = await stripe!.confirmPayment({
          elements: elements!,
          clientSecret,
          confirmParams: {
            return_url: `${window.location.origin}/checkout/complete`,
            payment_method_data: { billing_details: billingDetails() },
          },
          redirect: "if_required",
        })
        if (result.error) return result.error.message ?? "Your payment was declined."
        const status = result.paymentIntent?.status
        if (status !== "succeeded" && status !== "requires_capture" && status !== "processing") {
          return "Your payment wasn’t completed. Please try again."
        }
        return null
      }
    )
    if (error) {
      setFormError(error)
      setPaying(false)
    }
  }

  async function onExpressConfirm(event: StripeExpressCheckoutElementConfirmEvent) {
    setFormError(null)
    const { stripe, elements } = stripeRef.current
    if (!stripe || !elements) return event.paymentFailed()
    const { error: submitError } = await elements.submit()
    if (submitError) return event.paymentFailed()

    const ship = event.shippingAddress
    const [firstName, ...rest] = (ship?.name ?? event.billingDetails?.name ?? "").split(" ")
    const expressAddress: Address = {
      firstName: firstName ?? "",
      lastName: rest.join(" "),
      address1: ship?.address.line1 ?? "",
      address2: ship?.address.line2 ?? "",
      city: ship?.address.city ?? "",
      postalCode: ship?.address.postal_code ?? "",
      phone: event.billingDetails?.phone ?? "",
    }
    const optionId = event.shippingRate?.id ?? shippingId ?? shippingOptions[0]?.id
    if (!optionId) return event.paymentFailed()

    setPaying(true)
    const error = await placeOrder(
      { email: event.billingDetails?.email ?? email, refillReminders, address: expressAddress },
      optionId,
      async (clientSecret) => {
        if (!clientSecret) return "Payment couldn’t be started."
        const result = await stripe.confirmPayment({
          elements,
          clientSecret,
          confirmParams: { return_url: `${window.location.origin}/checkout/complete` },
          redirect: "if_required",
        })
        return result.error ? (result.error.message ?? "Payment failed.") : null
      }
    )
    if (error) {
      event.paymentFailed({ reason: "fail", message: error })
      setFormError(error)
      setPaying(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-wrap-reverse items-start gap-11 px-page pb-[90px] pt-10 lg:flex-wrap">
      <form onSubmit={onPay} noValidate className="grid min-w-0 flex-[1_1_520px] gap-9">
        {paymentsEnabled && (
          <StripeBridge onReady={onStripeReady} />
        )}

        {paymentsEnabled && (
          <div className={expressAvailable ? "" : "hidden"}>
            <div className="mb-3 text-center text-[13px] text-muted">Express checkout</div>
            <ExpressCheckout
              shippingOptions={shippingOptions}
              onShippingRateChange={chooseShipping}
              onConfirm={onExpressConfirm}
              onAvailable={setExpressAvailable}
            />
            <div className="mt-6 flex items-center gap-3.5 text-[13px] text-muted-2">
              <div className="h-px flex-1 bg-line" />
              or pay by card
              <div className="h-px flex-1 bg-line" />
            </div>
          </div>
        )}

        <section>
          <SectionHeading>1. Contact</SectionHeading>
          <div className="grid gap-3">
            <Field
              id="email"
              label="Email address"
              type="email"
              autoComplete="email"
              value={email}
              error={errors.email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Checkbox checked={refillReminders} onChange={setRefillReminders}>
              Email me when my scent needs a refill
            </Checkbox>
          </div>
        </section>

        <section>
          <SectionHeading>2. Delivery address</SectionHeading>
          <AddressFields value={address} onChange={updateAddress} errors={errors} withPhone />
        </section>

        <section>
          <SectionHeading>3. Delivery method</SectionHeading>
          <div role="radiogroup" aria-label="Delivery method" className="grid gap-2.5">
            {shippingOptions.length === 0 && (
              <p className="text-sm text-danger">
                No delivery options are available. Please contact us.
              </p>
            )}
            {shippingOptions.map((o) => {
              const selected = shippingId === o.id
              return (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-center justify-between rounded-[10px] border-[1.5px] bg-paper p-[18px] text-ink transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-teal ${
                    selected ? "border-ink" : "border-line hover:border-input-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    id={o === shippingOptions[0] ? "shipping" : undefined}
                    value={o.id}
                    checked={selected}
                    onChange={() => chooseShipping(o.id)}
                    className="sr-only"
                  />
                  <span>
                    <span className="block text-[15px] font-semibold">{o.name}</span>
                    {o.description && (
                      <span className="mt-[3px] block text-[13px] text-muted">{o.description}</span>
                    )}
                  </span>
                  <span className="font-semibold">{o.amount === 0 ? "Free" : formatMoney(o.amount)}</span>
                </label>
              )
            })}
            {errors.shipping && <p className="text-[13px] text-danger">{errors.shipping}</p>}
          </div>
        </section>

        <section>
          <SectionHeading>4. Payment</SectionHeading>
          {paymentsEnabled ? (
            <CardPayment />
          ) : (
            <div className="rounded-[10px] border-[1.5px] border-dashed border-input-border bg-paper p-5 text-sm leading-[1.6] text-ink-2">
              {allowTestOrders ? (
                <>
                  <strong className="text-ink">Test mode.</strong> Stripe isn’t connected yet, so
                  this places an unpaid test order.
                </>
              ) : (
                <>
                  <strong className="text-ink">Payments aren’t switched on yet.</strong> Add your
                  Stripe keys to start taking orders.
                </>
              )}
            </div>
          )}
          <div className="mt-3.5">
            <Checkbox checked={billingSame} onChange={setBillingSame}>
              Billing address same as delivery
            </Checkbox>
          </div>
          {!billingSame && (
            <div className="mt-4">
              <AddressFields value={billing} onChange={updateBilling} errors={errors} prefix="billing-" />
            </div>
          )}
        </section>

        <div>
          <button
            type="submit"
            disabled={paying || !canPay || !shippingId}
            className="flex h-[60px] w-full items-center justify-center gap-2.5 rounded-full bg-ink text-[17px] font-semibold text-paper transition-colors duration-200 hover:bg-teal disabled:opacity-60 disabled:hover:bg-ink"
          >
            {paying && <Spinner />}
            {paying ? "Processing…" : `Pay ${formatMoney(cart.total)}`}
          </button>
          {formError && (
            <p role="alert" className="mt-3 text-center text-sm text-danger">
              {formError}
            </p>
          )}
        </div>
      </form>

      <OrderSummary />
    </div>
  )
}

function AddressFields({
  value,
  onChange,
  errors,
  prefix = "",
  withPhone = false,
}: {
  value: Address
  onChange: (patch: Partial<Address>) => void
  errors: FieldErrors
  prefix?: string
  withPhone?: boolean
}) {
  const section = prefix ? "billing" : "shipping"
  const f = (key: keyof Address) => ({
    id: `${prefix}${key}`,
    value: value[key],
    error: errors[`${prefix}${key}`],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ [key]: e.target.value }),
  })
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field {...f("firstName")} label="First name" autoComplete={`${section} given-name`} />
      <Field {...f("lastName")} label="Last name" autoComplete={`${section} family-name`} />
      <Field {...f("address1")} label="Address" autoComplete={`${section} address-line1`} className="col-span-2" />
      <Field
        {...f("address2")}
        label="Flat, suite, etc. (optional)"
        autoComplete={`${section} address-line2`}
        className="col-span-2"
      />
      <Field {...f("city")} label="Town / city" autoComplete={`${section} address-level2`} />
      <Field {...f("postalCode")} label="Postcode" autoComplete={`${section} postal-code`} />
      {withPhone && (
        <Field
          {...f("phone")}
          label="Phone (for delivery updates)"
          type="tel"
          autoComplete={`${section} tel`}
          className="col-span-2"
        />
      )}
    </div>
  )
}
