import type { Metadata } from "next"
import { BagPage } from "@/components/cart/BagPage"

export const metadata: Metadata = { title: "Your bag" }

export default function CartPage() {
  return <BagPage />
}
