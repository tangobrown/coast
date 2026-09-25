import type { Metadata } from "next"
import Link from "next/link"
import { btnPrimary } from "@/components/ui/styles"

export const metadata: Metadata = { title: "Your subscriptions", robots: { index: false } }

export default function SubscriptionsPage() {
  return (
    <div className="rounded-[10px] bg-paper px-[30px] py-[70px] text-center">
      <p className="mb-2.5 font-serif text-[32px]">No subscriptions yet.</p>
      <p className="mb-[26px] text-muted">Refill subscriptions are coming soon — 5% off and free delivery.</p>
      <Link href="/shop/refills" className={`${btnPrimary} px-[34px] py-[15px] text-[15px]`}>
        Shop refills
      </Link>
    </div>
  )
}
