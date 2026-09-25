import type { Metadata } from "next"
import { AddressForm, DetailsForm } from "@/components/account/DetailsForms"
import { getCustomer } from "@/lib/auth"

export const metadata: Metadata = { title: "Your details", robots: { index: false } }

export default async function DetailsPage() {
  const customer = (await getCustomer())!
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] items-start gap-6">
      <DetailsForm customer={customer} />
      <AddressForm customer={customer} />
    </div>
  )
}
