import { CartDrawer } from "@/components/cart/CartDrawer"
import { AnnouncementBar } from "@/components/layout/AnnouncementBar"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { getScents } from "@/lib/catalogue"
import { toSearchItems } from "@/lib/search"

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const searchItems = toSearchItems(await getScents().catch(() => []))
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-paper focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <AnnouncementBar />
      <Header searchItems={searchItems} />
      <main id="main">{children}</main>
      <Footer />
      <CartDrawer />
    </>
  )
}
