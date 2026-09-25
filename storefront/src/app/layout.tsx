import type { Metadata } from "next"
import { Hanken_Grotesk, Instrument_Serif } from "next/font/google"
import { CartProvider } from "@/components/cart/CartProvider"
import { getCart } from "@/lib/cart"
import "./globals.css"

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
})

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken-grotesk",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Coast — Real fragrance for the car",
    template: "%s · Coast",
  },
  description:
    "Premium, refillable car fragrances made from real notes. Hang, Stick and Clip — never fake cherry, never bathroom cleaner.",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cart = await getCart().catch(() => null)
  return (
    <html lang="en-GB" className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-sand font-sans text-ink">
        <CartProvider initialCart={cart}>{children}</CartProvider>
      </body>
    </html>
  )
}
