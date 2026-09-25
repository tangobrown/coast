import type { Metadata } from "next"
import { ShopView } from "../ShopView"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ line: string }>
}): Promise<Metadata> {
  const { line } = await params
  const title = line === "refills" ? "Refills" : line.charAt(0).toUpperCase() + line.slice(1)
  return { title }
}

export default async function LinePage({ params }: { params: Promise<{ line: string }> }) {
  const { line } = await params
  return <ShopView filter={line.toLowerCase()} />
}
