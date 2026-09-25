"use server"

import type { HttpTypes } from "@medusajs/types"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { sdk } from "./medusa"
import { authHeaders, clearAuthToken, getAuthToken, setAuthToken } from "./session"
import type { Address, CustomerView, OrderSummary } from "./types"

export type AuthResult = { ok: true } | { ok: false; error: string }

const CART_COOKIE = "_coast_cart_id"

function friendly(e: unknown, fallback: string): string {
  const msg = e instanceof Error ? e.message : ""
  if (/invalid email or password|unauthorized/i.test(msg)) return "That email and password don’t match."
  if (/already exists/i.test(msg)) return "There’s already an account with that email. Try logging in."
  if (/password/i.test(msg) && /short|length|least/i.test(msg)) return msg
  console.error("[auth]", msg)
  return fallback
}

/** Attach the visitor's current bag to their account after they sign in. */
async function claimCart(token: string) {
  const cartId = (await cookies()).get(CART_COOKIE)?.value
  if (!cartId) return
  try {
    await sdk.store.cart.transferCart(cartId, { fields: "id" }, { authorization: `Bearer ${token}` })
  } catch (e) {
    console.error("[auth] could not attach bag to customer:", (e as Error).message)
  }
}

async function emailpassLogin(email: string, password: string): Promise<string> {
  const { token } = await sdk.client.fetch<{ token: string }>("/auth/customer/emailpass", {
    method: "POST",
    body: { email, password },
  })
  return token
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const token = await emailpassLogin(email.trim().toLowerCase(), password)
    await setAuthToken(token)
    await claimCart(token)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: friendly(e, "We couldn’t log you in. Please try again.") }
  }
}

export async function register(input: {
  firstName: string
  lastName: string
  email: string
  password: string
}): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase()
  if (input.password.length < 8) return { ok: false, error: "Use at least 8 characters for your password." }
  try {
    const { token: registrationToken } = await sdk.client.fetch<{ token: string }>(
      "/auth/customer/emailpass/register",
      { method: "POST", body: { email, password: input.password } }
    )
    await sdk.store.customer.create(
      { email, first_name: input.firstName.trim(), last_name: input.lastName.trim() },
      {},
      { authorization: `Bearer ${registrationToken}` }
    )
    // The registration token can't see the new customer yet; log in properly.
    const token = await emailpassLogin(email, input.password)
    await setAuthToken(token)
    await claimCart(token)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: friendly(e, "We couldn’t create your account. Please try again.") }
  }
}

export async function logout() {
  await clearAuthToken()
  // Start a fresh bag so the next shopper on this device doesn't see it.
  ;(await cookies()).delete(CART_COOKIE)
  redirect("/")
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  try {
    await sdk.client.fetch("/auth/customer/emailpass/reset-password", {
      method: "POST",
      body: { identifier: email.trim().toLowerCase() },
    })
  } catch (e) {
    console.error("[auth] reset request failed:", (e as Error).message)
  }
  // Always report success so the form can't be used to check who has an account.
  return { ok: true }
}

export async function resetPassword(token: string, email: string, password: string): Promise<AuthResult> {
  if (password.length < 8) return { ok: false, error: "Use at least 8 characters for your password." }
  try {
    await sdk.client.fetch("/auth/customer/emailpass/update", {
      method: "POST",
      body: { email, password },
      headers: { authorization: `Bearer ${token}` },
    })
    return { ok: true }
  } catch (e) {
    const msg = (e as Error).message ?? ""
    if (/unauthorized|expired|invalid/i.test(msg)) {
      return { ok: false, error: "This reset link has expired. Please request a new one." }
    }
    return { ok: false, error: friendly(e, "We couldn’t reset your password. Please try again.") }
  }
}

// ── Reading the signed-in customer ─────────────────────────────────────────

function toAddress(a: HttpTypes.StoreCustomerAddress): Address & { id: string } {
  return {
    id: a.id,
    firstName: a.first_name ?? "",
    lastName: a.last_name ?? "",
    address1: a.address_1 ?? "",
    address2: a.address_2 ?? "",
    city: a.city ?? "",
    postalCode: a.postal_code ?? "",
    phone: a.phone ?? "",
  }
}

/** The signed-in customer, or null for guests (or an expired login). */
export async function getCustomer(): Promise<CustomerView | null> {
  if (!(await getAuthToken())) return null
  try {
    const { customer } = await sdk.store.customer.retrieve(
      { fields: "id,email,first_name,last_name,phone,*addresses" },
      await authHeaders()
    )
    const addresses = customer.addresses ?? []
    const preferred =
      addresses.find((a) => a.is_default_shipping) ?? addresses[addresses.length - 1] ?? null
    return {
      id: customer.id,
      email: customer.email,
      firstName: customer.first_name ?? "",
      lastName: customer.last_name ?? "",
      phone: customer.phone ?? "",
      address: preferred ? toAddress(preferred) : null,
    }
  } catch {
    return null
  }
}

export async function listOrders(): Promise<OrderSummary[]> {
  if (!(await getAuthToken())) return []
  try {
    const { orders } = await sdk.store.order.list(
      {
        fields:
          "id,display_id,created_at,total,status,fulfillment_status,*items,items.product_title,items.variant_title,items.product_collection,items.quantity",
        order: "-created_at",
        limit: 50,
      } as any,
      await authHeaders()
    )
    return orders.map((o) => ({
      id: o.id,
      displayId: o.display_id ?? 0,
      createdAt: String(o.created_at),
      total: Number(o.total ?? 0),
      status: o.status ?? "",
      fulfillmentStatus: (o as any).fulfillment_status ?? "",
      items: (o.items ?? []).map((i) => ({
        title: i.product_title ?? i.title,
        subtitle: [i.product_collection, i.variant_title].filter(Boolean).join(" · "),
        quantity: Number(i.quantity),
      })),
    }))
  } catch (e) {
    console.error("[auth] listing orders failed:", (e as Error).message)
    return []
  }
}

// ── Updating details ────────────────────────────────────────────────────────

export async function updateDetails(input: {
  firstName: string
  lastName: string
  phone: string
}): Promise<AuthResult> {
  try {
    await sdk.store.customer.update(
      { first_name: input.firstName.trim(), last_name: input.lastName.trim(), phone: input.phone.trim() },
      {},
      await authHeaders()
    )
    return { ok: true }
  } catch (e) {
    return { ok: false, error: friendly(e, "We couldn’t save your details. Please try again.") }
  }
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

/** Saves the customer's delivery address (one address per customer for now). */
export async function saveAddress(address: Address): Promise<AuthResult> {
  try {
    const headers = await authHeaders()
    const current = await getCustomer()
    if (!current) return { ok: false, error: "Please log in again." }
    const body = { ...toMedusaAddress(address), is_default_shipping: true, is_default_billing: true }
    if (current.address) {
      await sdk.store.customer.updateAddress(current.address.id, body, {}, headers)
    } else {
      await sdk.store.customer.createAddress(body, {}, headers)
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: friendly(e, "We couldn’t save that address. Please try again.") }
  }
}
