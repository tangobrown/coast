import { NextResponse, type NextRequest } from "next/server"
import { completeCart } from "@/lib/cart"

/**
 * Stripe sends shoppers here after payment methods that leave the site
 * (some 3-D Secure flows, bank redirects). Finish the order and move on.
 */
export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("redirect_status")
  const base = request.nextUrl.origin

  if (status !== "succeeded" && status !== "processing") {
    return NextResponse.redirect(new URL("/checkout?payment=failed", base))
  }

  const result = await completeCart()
  if (!result.ok) {
    return NextResponse.redirect(new URL("/checkout?payment=failed", base))
  }
  return NextResponse.redirect(new URL(`/order/confirmed/${result.data.orderId}`, base))
}
