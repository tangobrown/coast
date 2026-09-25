import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/account/AuthShell"
import { LoginForm } from "@/components/account/AuthForms"
import { getCustomer } from "@/lib/auth"
import { safeNext } from "@/lib/safe-next"

export const metadata: Metadata = { title: "Log in", robots: { index: false } }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  if (await getCustomer()) redirect(safeNext(next))
  const registerHref = next ? `/account/register?next=${encodeURIComponent(next)}` : "/account/register"
  return (
    <AuthShell
      kicker="Your account"
      title={<>Welcome <em className="text-teal">back</em>.</>}
      intro="Log in to see your orders and manage refill subscriptions."
      footer={
        <>
          New to Coast?{" "}
          <Link href={registerHref} className="font-semibold text-teal">
            Create an account →
          </Link>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  )
}
