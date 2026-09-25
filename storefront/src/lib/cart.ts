"use server"

import type { HttpTypes } from "@medusajs/types"
import { cookies } from "next/headers"
import { getRegion, getScents } from "./catalogue"
import { sdk } from "./medusa"
import { authHeaders, getAuthToken } from "./session"
import { getCustomer, saveAddress } from "./auth"
import type { Address, CartView, ShippingOptionView } from "./types"

const CART_COOKIE = "_coast_cart_id"
/** Line-item metadata key the backend uses to mark a refill subscription. */
const SUBSCRIPTION_ITEM_KEY = "subscription_interval_weeks"

const CART_FIELDS =
  "id,email,region_id,metadata,item_total,shipping_total,discount_total,total,*items,*shipping_address,*shipping_methods,*promotions"

async function getCartId() {
  return (await cookies()).get(CART_COOKIE)?.value
}

async function setCartId(id: string) {
  ;(await cookies()).set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
}

async function clearCartId() {
  ;(await cookies()).delete(CART_COOKIE)
}

async function retrieveRaw(id: string): Promise<HttpTypes.StoreCart | null> {
  try {
    const { cart } = await sdk.client.fetch<HttpTypes.StoreCartResponse>(
      `/store/carts/${id}`,
      { query: { fields: CART_FIELDS }, cache: "no-store" }
    )
    // A completed cart has become an order and can't be shopped with again.
    if ((cart as any).completed_at) return null
    return cart
  } catch {
    return null
  }
}

async function toView(cart: HttpTypes.StoreCart): Promise<CartView> {
  const scents = await getScents()
  const items = (cart.items ?? [])
    .slice()
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    .map((item) => {
      const scent = scents.find((s) => s.id === item.product_id)
      const isRefill =
        scent?.refill?.id === item.variant_id ||
        (item.variant_title ?? "").toLowerCase() === "refill"
      const unit = Number(item.unit_price ?? 0)
      const weeks = Number((item.metadata as any)?.[SUBSCRIPTION_ITEM_KEY]) || null
      return {
        id: item.id,
        variantId: item.variant_id ?? "",
        productHandle: item.product_handle ?? scent?.handle ?? "",
        title: item.product_title ?? scent?.title ?? item.title,
        lineTitle: scent?.line?.title ?? item.product_collection ?? "",
        variantLabel: weeks
          ? `Refill every ${weeks} weeks`
          : isRefill
            ? "Refill"
            : (scent?.line?.format ?? item.variant_title ?? ""),
        quantity: item.quantity,
        unitPrice: unit,
        total: unit * item.quantity,
        thumbnail: item.thumbnail ?? scent?.thumbnail ?? null,
        subscriptionWeeks: weeks,
        compareAtPrice:
          weeks && (item as any).compare_at_unit_price ? Number((item as any).compare_at_unit_price) : null,
      }
    })

  const a = cart.shipping_address
  const shippingAddress: Address | null = a
    ? {
        firstName: a.first_name ?? "",
        lastName: a.last_name ?? "",
        address1: a.address_1 ?? "",
        address2: a.address_2 ?? "",
        city: a.city ?? "",
        postalCode: a.postal_code ?? "",
        phone: a.phone ?? "",
      }
    : null

  return {
    id: cart.id,
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    subtotal: Number(cart.item_total ?? 0),
    shippingTotal: Number(cart.shipping_total ?? 0),
    discountTotal: Number(cart.discount_total ?? 0),
    total: Number(cart.total ?? 0),
    email: cart.email ?? "",
    shippingAddress,
    shippingOptionId: cart.shipping_methods?.[0]?.shipping_option_id ?? null,
    promoCodes: (cart.promotions ?? [])
      .map((p) => p.code)
      .filter((c): c is string => !!c),
    refillReminders: (cart.metadata as any)?.refill_reminders !== false,
    hasSubscription: items.some((i) => i.subscriptionWeeks),
  }
}

/** Current cart for this visitor, or null if they haven't added anything yet. */
export async function getCart(): Promise<CartView | null> {
  const id = await getCartId()
  if (!id) return null
  const cart = await retrieveRaw(id)
  return cart ? toView(cart) : null
}

async function createCart(): Promise<string> {
  const region = await getRegion()
  // UK-only store: set the country up front so delivery options can be listed
  // before the shopper has typed an address.
  // Signed-in shoppers get a bag that belongs to their account.
  const { cart } = await sdk.store.cart.create(
    { region_id: region.id, shipping_address: { country_code: "gb" } },
    { fields: "id" },
    await authHeaders()
  )
  await setCartId(cart.id)
  return cart.id
}

async function viewById(id: string) {
  const cart = await retrieveRaw(id)
  if (!cart) throw new Error("Cart not found")
  return toView(cart)
}

export type ActionResult<T = CartView> = { ok: true; data: T } | { ok: false; error: string }

function fail(e: unknown): { ok: false; error: string } {
  const message = e instanceof Error ? e.message : "Something went wrong"
  console.error("[cart]", message)
  return { ok: false, error: message }
}

// Each mutation asks Medusa to return the updated cart in the same response,
// so a click is one round trip to the backend rather than three.
const WITH_CART = { fields: CART_FIELDS }

export async function addToCart(variantId: string, quantity: number): Promise<ActionResult> {
  const body = { variant_id: variantId, quantity }
  const started = Date.now()
  try {
    const existing = await getCartId()
    if (existing) {
      try {
        const { cart } = await sdk.store.cart.createLineItem(existing, body, WITH_CART)
        console.info(`[cart] add to bag: backend ${Date.now() - started}ms`)
        return { ok: true, data: await toView(cart) }
      } catch {
        // Cart expired or was already checked out — start a fresh one below.
      }
    }
    const id = await createCart()
    const { cart } = await sdk.store.cart.createLineItem(id, body, WITH_CART)
    console.info(`[cart] add to bag (new bag): backend ${Date.now() - started}ms`)
    return { ok: true, data: await toView(cart) }
  } catch (e) {
    return fail(e)
  }
}

export async function addSubscriptionToCart(
  variantId: string,
  quantity: number,
  intervalWeeks: number
): Promise<ActionResult> {
  const body = { variant_id: variantId, quantity, interval_weeks: intervalWeeks }
  const add = (cartId: string) =>
    sdk.client.fetch(`/store/carts/${cartId}/subscription-items`, { method: "POST", body })
  try {
    let id = await getCartId()
    if (!id || !(await retrieveRaw(id))) id = await createCart()
    await add(id)
    return { ok: true, data: await viewById(id) }
  } catch (e) {
    return fail(e)
  }
}

export async function updateLineItem(lineId: string, quantity: number): Promise<ActionResult> {
  try {
    const id = await getCartId()
    if (!id) throw new Error("No cart")
    if (quantity < 1) {
      const { parent } = await sdk.store.cart.deleteLineItem(id, lineId, WITH_CART)
      return { ok: true, data: parent ? await toView(parent) : await viewById(id) }
    }
    const { cart } = await sdk.store.cart.updateLineItem(id, lineId, { quantity }, WITH_CART)
    return { ok: true, data: await toView(cart) }
  } catch (e) {
    return fail(e)
  }
}

export async function removeLineItem(lineId: string): Promise<ActionResult> {
  return updateLineItem(lineId, 0)
}

export async function applyPromoCode(code: string): Promise<ActionResult> {
  try {
    const id = await getCartId()
    if (!id) throw new Error("No cart")
    const trimmed = code.trim()
    if (!trimmed) throw new Error("Enter a discount code")
    const { cart } = await sdk.store.cart.update(id, { promo_codes: [trimmed] }, WITH_CART)
    const applied = (cart.promotions ?? []).some(
      (p) => p.code?.toLowerCase() === trimmed.toLowerCase()
    )
    if (!applied) {
      return { ok: false, error: "That code isn’t valid." }
    }
    return { ok: true, data: await toView(cart) }
  } catch (e) {
    return fail(e)
  }
}

export async function removePromoCode(code: string): Promise<ActionResult> {
  try {
    const id = await getCartId()
    if (!id) throw new Error("No cart")
    await sdk.client.fetch(`/store/carts/${id}/promotions`, {
      method: "DELETE",
      body: { promo_codes: [code] },
    })
    return { ok: true, data: await viewById(id) }
  } catch (e) {
    return fail(e)
  }
}

// ── Checkout ─────────────────────────────────────────────────────────────

export async function listShippingOptions(): Promise<ShippingOptionView[]> {
  const id = await getCartId()
  if (!id) return []
  const { shipping_options } = await sdk.client.fetch<HttpTypes.StoreShippingOptionListResponse>(
    "/store/shipping-options",
    { query: { cart_id: id }, cache: "no-store" }
  )
  return shipping_options
    .map((o) => ({
      id: o.id,
      name: o.type?.label ?? o.name,
      description: o.type?.description ?? "",
      amount: Number((o as any).calculated_price?.calculated_amount ?? o.amount ?? 0),
      code: o.type?.code ?? "",
    }))
    .sort((a, b) => (a.code === "standard" ? -1 : b.code === "standard" ? 1 : a.amount - b.amount))
    .map(({ code: _code, ...rest }) => rest)
}

export type CheckoutDetails = {
  email: string
  refillReminders: boolean
  address: Address
  /** Omit when billing is the same as delivery. */
  billingAddress?: Address
}

function toMedusaAddress(a: Address) {
  return {
    first_name: a.firstName.trim(),
    last_name: a.lastName.trim(),
    address_1: a.address1.trim(),
    address_2: a.address2.trim(),
    city: a.city.trim(),
    postal_code: a.postalCode.trim().toUpperCase(),
    phone: a.phone.trim(),
    country_code: "gb",
  }
}

/** Saves contact + address, then (re)selects the delivery method. */
export async function saveCheckoutDetails(
  details: CheckoutDetails,
  shippingOptionId: string
): Promise<ActionResult> {
  try {
    const id = await getCartId()
    if (!id) throw new Error("Your bag has expired. Please add your items again.")
    const address = toMedusaAddress(details.address)
    await sdk.store.cart.update(id, {
      email: details.email.trim(),
      shipping_address: address,
      billing_address: details.billingAddress
        ? { ...toMedusaAddress(details.billingAddress), phone: address.phone }
        : address,
      metadata: { refill_reminders: details.refillReminders },
    })
    const { cart } = await sdk.store.cart.addShippingMethod(
      id,
      { option_id: shippingOptionId },
      WITH_CART
    )
    // First order for a signed-in customer: remember their address.
    if (await getAuthToken()) {
      const customer = await getCustomer()
      if (customer && !customer.address) await saveAddress(details.address)
    }
    return { ok: true, data: await toView(cart) }
  } catch (e) {
    return fail(e)
  }
}

/** Selects a delivery method on its own (used to keep the summary live). */
export async function setShippingMethod(shippingOptionId: string): Promise<ActionResult> {
  try {
    const id = await getCartId()
    if (!id) throw new Error("No cart")
    const { cart } = await sdk.store.cart.addShippingMethod(
      id,
      { option_id: shippingOptionId },
      WITH_CART
    )
    return { ok: true, data: await toView(cart) }
  } catch (e) {
    return fail(e)
  }
}

/**
 * Creates (or refreshes) the payment session for the cart and returns what
 * the browser needs to confirm it. For Stripe that's the PaymentIntent secret.
 */
export async function initiatePayment(
  providerId: string
): Promise<ActionResult<{ clientSecret: string | null }>> {
  try {
    const id = await getCartId()
    if (!id) throw new Error("No cart")
    const { cart } = await sdk.store.cart.retrieve(id, {
      fields:
        "id,total,currency_code,*items,*payment_collection,*payment_collection.payment_sessions",
    })
    const hasSubscription = (cart.items ?? []).some((i) => (i.metadata as any)?.[SUBSCRIPTION_ITEM_KEY])
    // Signed-in shoppers are sent as themselves so Medusa links a Stripe customer;
    // subscriptions also ask Stripe to keep the card for future renewals.
    const { payment_collection } = await sdk.store.payment.initiatePaymentSession(
      cart,
      {
        provider_id: providerId,
        ...(hasSubscription ? { data: { setup_future_usage: "off_session" } } : {}),
      },
      {},
      await authHeaders()
    )
    const session = payment_collection.payment_sessions?.find(
      (s) => s.provider_id === providerId
    )
    return {
      ok: true,
      data: { clientSecret: (session?.data as any)?.client_secret ?? null },
    }
  } catch (e) {
    return fail(e)
  }
}

/** Places the order. On success the cart cookie is cleared. */
export async function completeCart(): Promise<ActionResult<{ orderId: string }>> {
  try {
    const id = await getCartId()
    if (!id) throw new Error("No cart")
    const result = await sdk.store.cart.complete(id)
    if (result.type === "order") {
      await clearCartId()
      return { ok: true, data: { orderId: result.order.id } }
    }
    return {
      ok: false,
      error: result.error?.message ?? "We couldn’t complete your order. Please try again.",
    }
  } catch (e) {
    return fail(e)
  }
}
