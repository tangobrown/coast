import type { HttpTypes } from "@medusajs/types"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { btnPrimary, eyebrow } from "@/components/ui/styles"
import { sdk } from "@/lib/medusa"
import { formatMoney } from "@/lib/money"

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } }

async function getOrder(id: string) {
  try {
    const { order } = await sdk.client.fetch<HttpTypes.StoreOrderResponse>(`/store/orders/${id}`, {
      query: { fields: "id,display_id,total,metadata,*shipping_methods" },
      cache: "no-store",
    })
    return order
  } catch {
    return null
  }
}

export default async function OrderConfirmedPage({ params }: { params: Promise<{ id: string }> }) {
  const order = await getOrder((await params).id)
  if (!order) notFound()

  const method = order.shipping_methods?.[0]?.name ?? "Standard · Royal Mail"
  const reminders = (order.metadata as any)?.refill_reminders !== false

  const stats = [
    { label: "Paid", value: formatMoney(order.total) },
    { label: "Delivery", value: method },
    { label: "First refill reminder", value: reminders ? "In ~5 weeks" : "Off" },
  ]

  return (
    <div className="mx-auto max-w-[760px] px-page pb-[100px] pt-[60px] text-center">
      <div className={`mb-[18px] ${eyebrow}`}>Order #CF{order.display_id}</div>
      <h1 className="mb-5 font-serif text-[clamp(48px,6vw,80px)] font-normal leading-none">
        Thank you. <em className="text-teal">Something real</em> is on its way.
      </h1>
      <p className="mx-auto mb-10 max-w-[520px] text-lg leading-[1.6] text-ink-2">
        A confirmation is heading to your inbox. We’ll send tracking once it’s packed — and a
        gentle nudge when it’s time for a refill.
      </p>
      <dl className="mb-10 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-0.5 overflow-hidden rounded-[10px] bg-line text-left">
        {stats.map((s) => (
          <div key={s.label} className="bg-paper p-[22px]">
            <dt className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-2">
              {s.label}
            </dt>
            <dd className="text-lg font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>
      <Link href="/shop" className={btnPrimary}>
        Continue shopping
      </Link>
    </div>
  )
}
