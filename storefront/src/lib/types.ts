export type LineHandle = "hang" | "stick" | "clip"

export type Line = {
  id: string
  handle: string
  title: string
  format: string
  life: string
  intro: string
  desc: string
  howToUse: string
  sort: number
}

export type VariantKind = "full" | "refill"

export type ScentVariant = {
  id: string
  price: number
}

export type Scent = {
  id: string
  handle: string
  title: string
  description: string
  shortNotes: string
  notes: { top: string; heart: string; base: string }
  line: Line | null
  full: ScentVariant | null
  refill: ScentVariant | null
  thumbnail: string | null
  images: string[]
  sort: number
  bestsellerRank: number | null
}

export type CartLine = {
  id: string
  variantId: string
  productHandle: string
  title: string
  lineTitle: string
  variantLabel: string
  quantity: number
  unitPrice: number
  total: number
  thumbnail: string | null
}

export type Address = {
  firstName: string
  lastName: string
  address1: string
  address2: string
  city: string
  postalCode: string
  phone: string
}

export type CartView = {
  id: string
  items: CartLine[]
  itemCount: number
  subtotal: number
  shippingTotal: number
  discountTotal: number
  total: number
  email: string
  shippingAddress: Address | null
  shippingOptionId: string | null
  promoCodes: string[]
  refillReminders: boolean
}

export type ShippingOptionView = {
  id: string
  name: string
  description: string
  amount: number
}

export type CustomerView = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  /** Default delivery address, if the customer has saved one. */
  address: (Address & { id: string }) | null
}

export type OrderSummary = {
  id: string
  displayId: number
  createdAt: string
  total: number
  status: string
  fulfillmentStatus: string
  items: { title: string; subtitle: string; quantity: number }[]
}
