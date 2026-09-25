import { redirect } from "next/navigation"
import { AccountTabs } from "@/components/account/AccountTabs"
import { eyebrow } from "@/components/ui/styles"
import { getCustomer, logout } from "@/lib/auth"

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const customer = await getCustomer()
  if (!customer) redirect("/account/login?next=/account")

  return (
    <div className="mx-auto max-w-[1200px] px-page pb-[90px] pt-[30px]">
      <div className={`mb-4 ${eyebrow}`}>Your account</div>
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-8">
        <h1 className="font-serif text-[clamp(44px,5vw,72px)] font-normal leading-none">
          Hello, <em className="text-teal">{customer.firstName || "there"}</em>.
        </h1>
        <form action={logout}>
          <button type="submit" className="text-sm font-semibold text-muted underline hover:text-teal">
            Log out
          </button>
        </form>
      </div>
      <div className="py-7">
        <AccountTabs />
      </div>
      {children}
    </div>
  )
}
