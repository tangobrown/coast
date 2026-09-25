import type { Metadata } from "next"
import Link from "next/link"
import { AuthShell } from "@/components/account/AuthShell"
import { ResetPasswordForm } from "@/components/account/AuthForms"

export const metadata: Metadata = { title: "Reset password", robots: { index: false } }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>
}) {
  const { token, email } = await searchParams
  return (
    <AuthShell
      kicker="Your account"
      title="Choose a new password"
      footer={
        <Link href="/account/forgot-password" className="font-semibold text-teal">
          Need a new link?
        </Link>
      }
    >
      {token && email ? (
        <ResetPasswordForm token={token} email={email} />
      ) : (
        <p className="text-center text-ink-2">This link isn’t complete. Please request a new one.</p>
      )}
    </AuthShell>
  )
}
