import Link from "next/link"
import { btnPrimary } from "@/components/ui/styles"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[760px] px-page py-32 text-center">
      <p className="mb-4 text-[13px] uppercase tracking-[0.2em] text-muted-2">404</p>
      <h1 className="mb-6 font-serif text-[clamp(44px,5vw,72px)] font-normal leading-none">
        This road doesn’t go <em className="text-teal">anywhere</em>.
      </h1>
      <Link href="/" className={btnPrimary}>
        Back home
      </Link>
    </div>
  )
}
