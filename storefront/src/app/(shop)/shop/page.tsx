import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ShopView } from "./ShopView"

export const metadata: Metadata = { title: "All scents" }

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ line?: string }>
}) {
  // Support the ?line= form from the handoff by redirecting to the nicer URL.
  const { line } = await searchParams
  if (line) redirect(`/shop/${encodeURIComponent(line)}`)
  return <ShopView filter="all" />
}
