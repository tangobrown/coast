import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/account/AuthShell"
import { RegisterForm } from "@/components/account/AuthForms"
import { getCustomer } from "@/lib/auth"
import { safeNext } from "@/lib/safe-next"

export const metadata: Metadata = { title: "Create an account", robots: { index: false } }

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  if (await getCustomer()) redirect(safeNext(next))
  const loginHref = next ? `/account/login?next=${encodeURIComponent(next)}` : "/account/login"
  return (
    <AuthShell
      kicker="Your account"
      title={<>Create an <em className="text-teal">account</em>.</>}
      intro="Track orders, save your address, and subscribe to refills — 5% off and free delivery."
      footer={
        <>
          Already have an account?{" "}
          <Link href={loginHref} className="font-semibold text-teal">
            Log in →
          </Link>
        </>
      }
    >
      <RegisterForm next={next} />
    </AuthShell>
  )
}
