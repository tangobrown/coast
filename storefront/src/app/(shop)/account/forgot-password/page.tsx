import type { Metadata } from "next"
import Link from "next/link"
import { AuthShell } from "@/components/account/AuthShell"
import { ForgotPasswordForm } from "@/components/account/AuthForms"

export const metadata: Metadata = { title: "Forgotten password", robots: { index: false } }

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      kicker="Your account"
      title="Forgotten your password?"
      intro="Enter your email and we’ll send you a link to choose a new one."
      footer={
        <Link href="/account/login" className="font-semibold text-teal">
          ← Back to log in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}
