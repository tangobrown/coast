import type { Metadata } from "next"
import Link from "next/link"
import { SubscriptionCard, type RefillChoice } from "@/components/account/SubscriptionCard"
import { btnPrimary } from "@/components/ui/styles"
import { getScents } from "@/lib/catalogue"
import { listSubscriptions } from "@/lib/subscriptions"

export const metadata: Metadata = { title: "Your subscriptions", robots: { index: false } }

export default async function SubscriptionsPage() {
  const [subscriptions, scents] = await Promise.all([listSubscriptions(), getScents()])
  const refills: RefillChoice[] = scents
    .filter((s) => s.refill)
    .map((s) => ({ variantId: s.refill!.id, title: s.title, lineTitle: s.line?.title ?? "" }))

  if (subscriptions.length === 0) {
    return (
      <div className="rounded-[10px] bg-paper px-[30px] py-[70px] text-center">
        <p className="mb-2.5 font-serif text-[32px]">No subscriptions yet.</p>
        <p className="mx-auto mb-[26px] max-w-[440px] text-muted">
          Subscribe to any refill for 5% off and free delivery. Skip, pause or cancel any time.
        </p>
        <Link href="/shop/refills" className={`${btnPrimary} px-[34px] py-[15px] text-[15px]`}>
          Shop refills
        </Link>
      </div>
    )
  }

  // Active and paused first, cancelled last.
  const order = { payment_failed: 0, active: 1, paused: 2, cancelled: 3 } as const
  const sorted = [...subscriptions].sort((a, b) => order[a.status] - order[b.status])

  return (
    <div className="grid gap-4">
      {sorted.map((s) => (
        <SubscriptionCard
          key={s.id}
          initial={s}
          refills={refills}
          stripeKey={process.env.STRIPE_PUBLISHABLE_KEY || null}
        />
      ))}
    </div>
  )
}
