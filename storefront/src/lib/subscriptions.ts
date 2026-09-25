"use server"

import { sdk } from "./medusa"
import { authHeaders, getAuthToken } from "./session"
import type { SubscriptionView } from "./types"

type Raw = Record<string, any>

function toView(s: Raw): SubscriptionView {
  return {
    id: s.id,
    status: s.status,
    productId: s.product_id,
    variantId: s.variant_id,
    productTitle: s.product_title,
    lineTitle: s.line_title ?? null,
    quantity: Number(s.quantity ?? 1),
    intervalWeeks: Number(s.interval_weeks),
    nextChargeAt: String(s.next_charge_at),
    lastChargedAt: s.last_charged_at ? String(s.last_charged_at) : null,
    lastFailureReason: s.last_failure_reason ?? null,
    hasCard: !!s.has_card,
    price: s.price ?? null,
    subscriptionPrice: s.subscription_price ?? null,
  }
}

export type SubResult<T = SubscriptionView> = { ok: true; data: T } | { ok: false; error: string }

function fail(e: unknown): { ok: false; error: string } {
  const msg = e instanceof Error ? e.message : "Something went wrong"
  return { ok: false, error: msg || "Something went wrong" }
}

export async function listSubscriptions(): Promise<SubscriptionView[]> {
  if (!(await getAuthToken())) return []
  try {
    const { subscriptions } = await sdk.client.fetch<{ subscriptions: Raw[] }>(
      "/store/customers/me/subscriptions",
      { headers: await authHeaders(), cache: "no-store" }
    )
    return subscriptions.map(toView)
  } catch (e) {
    console.error("[subscriptions] list failed:", (e as Error).message)
    return []
  }
}

export type SubscriptionAction =
  | { action: "skip" | "pause" | "resume" | "cancel" | "retry" }
  | { action: "update"; interval_weeks?: number; variant_id?: string }

export async function changeSubscription(id: string, change: SubscriptionAction): Promise<SubResult> {
  try {
    const { subscription } = await sdk.client.fetch<{ subscription: Raw }>(
      `/store/customers/me/subscriptions/${encodeURIComponent(id)}`,
      { method: "POST", body: change, headers: await authHeaders() }
    )
    return { ok: true, data: toView(subscription) }
  } catch (e) {
    return fail(e)
  }
}

/** Step 1 of a card update: a SetupIntent secret for Stripe's Payment Element. */
export async function startCardUpdate(): Promise<SubResult<{ clientSecret: string }>> {
  try {
    const { client_secret } = await sdk.client.fetch<{ client_secret: string }>(
      "/store/customers/me/subscriptions/card/setup",
      { method: "POST", headers: await authHeaders() }
    )
    return { ok: true, data: { clientSecret: client_secret } }
  } catch (e) {
    return fail(e)
  }
}

/** Step 2: save the confirmed card on every subscription (and retry failed ones). */
export async function finishCardUpdate(setupIntentId: string): Promise<SubResult<{ retried: number }>> {
  try {
    const { retried } = await sdk.client.fetch<{ retried: string[] }>(
      "/store/customers/me/subscriptions/card",
      { method: "POST", body: { setup_intent_id: setupIntentId }, headers: await authHeaders() }
    )
    return { ok: true, data: { retried: retried.length } }
  } catch (e) {
    return fail(e)
  }
}
