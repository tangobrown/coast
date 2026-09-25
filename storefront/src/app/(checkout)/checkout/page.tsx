import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { CheckoutClient } from "@/components/checkout/CheckoutClient"
import { getCustomer } from "@/lib/auth"
import { getCart, listShippingOptions } from "@/lib/cart"

export const metadata: Metadata = { title: "Checkout", robots: { index: false } }

export default async function CheckoutPage() {
  const cart = await getCart()
  if (!cart || cart.items.length === 0) redirect("/cart")
  const [shippingOptions, customer] = await Promise.all([listShippingOptions(), getCustomer()])

  return (
    <CheckoutClient
      shippingOptions={shippingOptions}
      stripeKey={process.env.STRIPE_PUBLISHABLE_KEY || null}
      allowTestOrders={process.env.ALLOW_TEST_ORDERS === "true"}
      customer={customer}
    />
  )
}
