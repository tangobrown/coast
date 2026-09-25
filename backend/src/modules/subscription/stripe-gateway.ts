import Stripe from "stripe"

export type ChargeResult =
  | { ok: true; id: string }
  | { ok: false; reason: string; declineCode?: string }

export type ChargeInput = {
  customer: string | null
  paymentMethod: string | null
  amount: number // pounds
  idempotencyKey: string
  description: string
  metadata: Record<string, string>
}

export interface PaymentGateway {
  readonly live: boolean
  charge(input: ChargeInput): Promise<ChargeResult>
  createSetupIntent(customer: string): Promise<{ clientSecret: string }>
  /** Resolve a confirmed SetupIntent to the card it saved. */
  paymentMethodFromSetupIntent(id: string, customer: string): Promise<string>
}

function reasonFor(e: any): string {
  const code = e?.decline_code ?? e?.code
  switch (code) {
    case "authentication_required":
      return "your bank asked to confirm the payment"
    case "insufficient_funds":
      return "insufficient funds"
    case "expired_card":
      return "the card has expired"
    case "card_declined":
    case "generic_decline":
      return "the card was declined"
    default:
      return "the payment was declined"
  }
}

class StripeGateway implements PaymentGateway {
  readonly live = true
  private stripe: Stripe

  constructor(apiKey: string) {
    this.stripe = new Stripe(apiKey)
  }

  async charge(input: ChargeInput): Promise<ChargeResult> {
    if (!input.customer || !input.paymentMethod) {
      return { ok: false, reason: "no saved card" }
    }
    try {
      const pi = await this.stripe.paymentIntents.create(
        {
          amount: Math.round(input.amount * 100),
          currency: "gbp",
          customer: input.customer,
          payment_method: input.paymentMethod,
          off_session: true,
          confirm: true,
          description: input.description,
          metadata: input.metadata,
        },
        { idempotencyKey: input.idempotencyKey }
      )
      if (pi.status === "succeeded" || pi.status === "processing") return { ok: true, id: pi.id }
      return { ok: false, reason: pi.status === "requires_action" ? reasonFor({ code: "authentication_required" }) : "the payment was declined" }
    } catch (e: any) {
      return { ok: false, reason: reasonFor(e), declineCode: e?.decline_code ?? e?.code }
    }
  }

  async createSetupIntent(customer: string) {
    const si = await this.stripe.setupIntents.create({
      customer,
      usage: "off_session",
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    })
    return { clientSecret: si.client_secret! }
  }

  async paymentMethodFromSetupIntent(id: string, customer: string) {
    const si = await this.stripe.setupIntents.retrieve(id)
    const siCustomer = typeof si.customer === "string" ? si.customer : si.customer?.id
    if (si.status !== "succeeded" || siCustomer !== customer) {
      throw new Error("That card couldn’t be saved. Please try again.")
    }
    const pm = typeof si.payment_method === "string" ? si.payment_method : si.payment_method?.id
    if (!pm) throw new Error("That card couldn’t be saved. Please try again.")
    return pm
  }
}

/**
 * Used when STRIPE_API_KEY isn't set (local development / before Stripe is
 * connected). Pretends every charge succeeds, except for the payment method
 * "pm_test_fail", which lets the failure path be tested.
 */
class TestGateway implements PaymentGateway {
  readonly live = false

  async charge(input: ChargeInput): Promise<ChargeResult> {
    if (input.paymentMethod === "pm_test_fail") return { ok: false, reason: "the card was declined" }
    return { ok: true, id: `pi_test_${input.idempotencyKey}` }
  }

  async createSetupIntent(): Promise<{ clientSecret: string }> {
    throw new Error("Stripe isn’t connected yet.")
  }

  async paymentMethodFromSetupIntent(): Promise<string> {
    throw new Error("Stripe isn’t connected yet.")
  }
}

let gateway: PaymentGateway | null = null
export function getPaymentGateway(): PaymentGateway {
  gateway ??= process.env.STRIPE_API_KEY ? new StripeGateway(process.env.STRIPE_API_KEY) : new TestGateway()
  return gateway
}
