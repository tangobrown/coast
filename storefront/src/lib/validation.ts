import type { Address } from "./types"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// UK postcode, e.g. SW1A 1AA, M1 1AE, B33 8TH, CR2 6XH, DN55 1PT, GIR 0AA
const UK_POSTCODE = /^(GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i

export type FieldErrors = Partial<Record<string, string>>

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return "Enter your email address"
  if (!EMAIL.test(email.trim())) return "Enter a valid email address, like name@example.com"
}

export function validateAddress(a: Address, prefix = ""): FieldErrors {
  const e: FieldErrors = {}
  if (!a.firstName.trim()) e[`${prefix}firstName`] = "Enter your first name"
  if (!a.lastName.trim()) e[`${prefix}lastName`] = "Enter your last name"
  if (!a.address1.trim()) e[`${prefix}address1`] = "Enter your address"
  if (!a.city.trim()) e[`${prefix}city`] = "Enter your town or city"
  if (!a.postalCode.trim()) e[`${prefix}postalCode`] = "Enter your postcode"
  else if (!UK_POSTCODE.test(a.postalCode.trim()))
    e[`${prefix}postalCode`] = "Enter a valid UK postcode"
  return e
}

export const EMPTY_ADDRESS: Address = {
  firstName: "",
  lastName: "",
  address1: "",
  address2: "",
  city: "",
  postalCode: "",
  phone: "",
}
