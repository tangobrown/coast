import Link from "next/link"

// Distraction-free: no announcement bar, main nav or footer.
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sand">
      <header className="flex items-center justify-between gap-4 border-b border-line bg-paper px-page py-[22px]">
        <Link href="/" className="font-serif text-[30px] leading-none">
          Coast
        </Link>
        <div className="hidden text-[13px] font-semibold uppercase tracking-[0.12em] text-muted sm:block">
          Secure checkout
        </div>
        <Link href="/cart" className="text-sm font-semibold text-teal">
          ← Back to bag
        </Link>
      </header>
      <main>{children}</main>
    </div>
  )
}
