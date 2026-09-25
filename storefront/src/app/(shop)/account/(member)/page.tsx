import type { Metadata } from "next"
import Link from "next/link"
import { btnPrimary } from "@/components/ui/styles"
import { listOrders } from "@/lib/auth"
import { formatDate } from "@/lib/dates"
import { formatMoney } from "@/lib/money"

export const metadata: Metadata = { title: "Your orders", robots: { index: false } }


function statusLabel(status: string, fulfillment: string) {
  if (status === "canceled") return "Cancelled"
  if (fulfillment === "delivered") return "Delivered"
  if (fulfillment === "shipped" || fulfillment === "partially_shipped") return "On its way"
  if (fulfillment === "fulfilled") return "Packed"
  return "Preparing"
}

export default async function OrdersPage() {
  const orders = await listOrders()

  if (orders.length === 0) {
    return (
      <div className="rounded-[10px] bg-paper px-[30px] py-[70px] text-center">
        <p className="mb-2.5 font-serif text-[32px]">No orders yet.</p>
        <p className="mb-[26px] text-muted">When you order, it’ll show up here.</p>
        <Link href="/shop" className={`${btnPrimary} px-[34px] py-[15px] text-[15px]`}>
          Shop all scents
        </Link>
      </div>
    )
  }

  return (
    <ul className="grid gap-3">
      {orders.map((o) => (
        <li key={o.id}>
          <Link
            href={`/order/confirmed/${o.id}`}
            className="grid gap-3 rounded-[10px] bg-paper p-6 transition-colors hover:bg-hover hover:text-ink sm:grid-cols-[1fr_auto]"
          >
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-2">
                Order #CF{o.displayId} · {formatDate(o.createdAt)}
              </div>
              <div className="text-[15px] leading-[1.6] text-ink-2">
                {o.items.map((i, n) => (
                  <span key={n}>
                    {n > 0 && ", "}
                    <span className="font-semibold text-ink">{i.title}</span>
                    {i.subtitle && ` (${i.subtitle})`}
                    {i.quantity > 1 && ` × ${i.quantity}`}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-5 sm:justify-end">
              <span className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-teal">
                {statusLabel(o.status, o.fulfillmentStatus)}
              </span>
              <span className="text-base font-semibold">{formatMoney(o.total)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
