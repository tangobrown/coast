"use client"

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import * as actions from "@/lib/cart"
import type { ActionResult } from "@/lib/cart"
import type { CartView } from "@/lib/types"

type CartContextValue = {
  cart: CartView | null
  setCart: (cart: CartView | null) => void
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  pending: boolean
  error: string | null
  addItem: (variantId: string, quantity: number) => Promise<boolean>
  addSubscription: (variantId: string, quantity: number, intervalWeeks: number) => Promise<boolean>
  updateItem: (lineId: string, quantity: number) => Promise<boolean>
  removeItem: (lineId: string) => Promise<boolean>
}

const CartContext = createContext<CartContextValue | null>(null)

/** Applies a quantity change locally so the UI responds before the server does. */
function withQuantity(cart: CartView, lineId: string, quantity: number): CartView {
  const items = cart.items
    .map((i) => (i.id === lineId ? { ...i, quantity, total: i.unitPrice * quantity } : i))
    .filter((i) => i.quantity > 0)
  const subtotal = items.reduce((n, i) => n + i.total, 0)
  return {
    ...cart,
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    subtotal,
    total: Math.max(0, subtotal + cart.shippingTotal - cart.discountTotal),
  }
}

export function CartProvider({
  initialCart,
  children,
}: {
  initialCart: CartView | null
  children: React.ReactNode
}) {
  const [cart, setCart] = useState<CartView | null>(initialCart)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inflight, setInflight] = useState(0)

  // Latest confirmed cart, for rolling back a failed optimistic update, and a
  // counter so only the newest response is applied when clicks overlap.
  const confirmed = useRef<CartView | null>(initialCart)
  const latest = useRef(0)

  const run = useCallback(
    async (fn: () => Promise<ActionResult>, optimistic?: (c: CartView) => CartView) => {
      setError(null)
      if (optimistic) setCart((c) => (c ? optimistic(c) : c))
      const ticket = ++latest.current
      setInflight((n) => n + 1)
      try {
        const res = await fn()
        if (res.ok) confirmed.current = res.data
        if (ticket === latest.current) {
          if (res.ok) setCart(res.data)
          else {
            setError(res.error)
            setCart(confirmed.current)
          }
        }
        return res.ok
      } catch {
        if (ticket === latest.current) {
          setError("Something went wrong. Please try again.")
          setCart(confirmed.current)
        }
        return false
      } finally {
        setInflight((n) => n - 1)
      }
    },
    []
  )

  const setCartConfirmed = useCallback((c: CartView | null) => {
    confirmed.current = c
    setCart(c)
  }, [])
  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      setCart: setCartConfirmed,
      drawerOpen,
      openDrawer,
      closeDrawer,
      pending: inflight > 0,
      error,
      addItem: (variantId, quantity) => run(() => actions.addToCart(variantId, quantity)),
      addSubscription: (variantId, quantity, intervalWeeks) =>
        run(() => actions.addSubscriptionToCart(variantId, quantity, intervalWeeks)),
      updateItem: (lineId, quantity) =>
        run(
          () => actions.updateLineItem(lineId, quantity),
          (c) => withQuantity(c, lineId, quantity)
        ),
      removeItem: (lineId) =>
        run(
          () => actions.removeLineItem(lineId),
          (c) => withQuantity(c, lineId, 0)
        ),
    }),
    [cart, drawerOpen, inflight, error, run, setCartConfirmed, openDrawer, closeDrawer]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>")
  return ctx
}
