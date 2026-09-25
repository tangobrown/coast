"use client"

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react"
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
  updateItem: (lineId: string, quantity: number) => Promise<boolean>
  removeItem: (lineId: string) => Promise<boolean>
}

const CartContext = createContext<CartContextValue | null>(null)

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
  const [pending, startTransition] = useTransition()

  const run = useCallback(
    (fn: () => Promise<ActionResult>) =>
      new Promise<boolean>((resolve) => {
        setError(null)
        startTransition(async () => {
          const res = await fn()
          if (res.ok) {
            setCart(res.data)
            resolve(true)
          } else {
            setError(res.error)
            resolve(false)
          }
        })
      }),
    []
  )

  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      setCart,
      drawerOpen,
      openDrawer,
      closeDrawer,
      pending,
      error,
      addItem: (variantId, quantity) => run(() => actions.addToCart(variantId, quantity)),
      updateItem: (lineId, quantity) => run(() => actions.updateLineItem(lineId, quantity)),
      removeItem: (lineId) => run(() => actions.removeLineItem(lineId)),
    }),
    [cart, drawerOpen, pending, error, run, openDrawer, closeDrawer]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>")
  return ctx
}
