"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { saveAddress, updateDetails } from "@/lib/auth"
import type { Address, CustomerView } from "@/lib/types"
import { EMPTY_ADDRESS, validateAddress, type FieldErrors } from "@/lib/validation"
import { Field, SectionHeading } from "../checkout/Field"
import { Spinner } from "../ui/Spinner"

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-[50px] items-center justify-center gap-2 rounded-full bg-ink px-8 text-[15px] font-semibold text-paper transition-colors hover:bg-teal disabled:opacity-60"
    >
      {pending && <Spinner />}
      Save
    </button>
  )
}

function Status({ saved, error }: { saved: boolean; error: string | null }) {
  if (error) return <p role="alert" className="text-sm text-danger">{error}</p>
  if (saved) return <p role="status" className="text-sm text-teal">Saved.</p>
  return null
}

export function DetailsForm({ customer }: { customer: CustomerView }) {
  const router = useRouter()
  const [form, setForm] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
  })
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaved(false)
    setForm((f) => ({ ...f, [k]: e.target.value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.firstName.trim() || !form.lastName.trim()) return setError("Enter your first and last name.")
    setPending(true)
    const res = await updateDetails(form)
    setPending(false)
    if (!res.ok) return setError(res.error)
    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-[10px] bg-paper p-7">
      <SectionHeading>Your details</SectionHeading>
      <div className="grid grid-cols-2 gap-3">
        <Field id="firstName" label="First name" autoComplete="given-name" value={form.firstName} onChange={set("firstName")} />
        <Field id="lastName" label="Last name" autoComplete="family-name" value={form.lastName} onChange={set("lastName")} />
        <Field id="email" label="Email address" value={customer.email} readOnly disabled className="col-span-2 opacity-70" />
        <Field id="phone" label="Phone (optional)" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} className="col-span-2" />
      </div>
      <div className="mt-5 flex items-center gap-4">
        <SaveButton pending={pending} />
        <Status saved={saved} error={error} />
      </div>
    </form>
  )
}

export function AddressForm({ customer }: { customer: CustomerView }) {
  const router = useRouter()
  const [value, setValue] = useState<Address>(
    customer.address
      ? { ...EMPTY_ADDRESS, ...customer.address }
      : { ...EMPTY_ADDRESS, firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone }
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const f = (key: keyof Address) => ({
    id: `addr-${key}`,
    value: value[key],
    error: errors[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setSaved(false)
      setValue((v) => ({ ...v, [key]: e.target.value }))
    },
  })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const errs = validateAddress(value)
    setErrors(errs)
    if (Object.keys(errs).length) return
    setPending(true)
    const res = await saveAddress(value)
    setPending(false)
    if (!res.ok) return setError(res.error)
    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-[10px] bg-paper p-7">
      <SectionHeading>Delivery address</SectionHeading>
      <p className="mb-4 text-sm text-muted">Used to fill in checkout, and for refill subscriptions.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field {...f("firstName")} label="First name" autoComplete="shipping given-name" />
        <Field {...f("lastName")} label="Last name" autoComplete="shipping family-name" />
        <Field {...f("address1")} label="Address" autoComplete="shipping address-line1" className="col-span-2" />
        <Field {...f("address2")} label="Flat, suite, etc. (optional)" autoComplete="shipping address-line2" className="col-span-2" />
        <Field {...f("city")} label="Town / city" autoComplete="shipping address-level2" />
        <Field {...f("postalCode")} label="Postcode" autoComplete="shipping postal-code" />
      </div>
      <div className="mt-5 flex items-center gap-4">
        <SaveButton pending={pending} />
        <Status saved={saved} error={error} />
      </div>
    </form>
  )
}
