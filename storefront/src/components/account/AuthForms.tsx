"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { login, register, requestPasswordReset, resetPassword } from "@/lib/auth"
import { safeNext } from "@/lib/safe-next"
import { validateEmail } from "@/lib/validation"
import { Field } from "../checkout/Field"
import { Spinner } from "../ui/Spinner"

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-ink text-base font-semibold text-paper transition-colors duration-200 hover:bg-teal disabled:opacity-60 disabled:hover:bg-ink"
    >
      {pending && <Spinner />}
      {children}
    </button>
  )
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-center text-sm text-danger">
      {message}
    </p>
  )
}


export function LoginForm({ next }: { next?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const emailError = validateEmail(email)
    if (emailError || !password) return setError(emailError ?? "Enter your password.")
    setPending(true)
    const res = await login(email, password)
    if (!res.ok) {
      setError(res.error)
      setPending(false)
      return
    }
    router.replace(safeNext(next))
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3">
      <Field id="email" label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field id="password" label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className="mb-2 text-right">
        <Link href="/account/forgot-password" className="text-sm text-muted underline">
          Forgotten your password?
        </Link>
      </div>
      <Submit pending={pending}>Log in</Submit>
      <FormError message={error} />
    </form>
  )
}

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter()
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.firstName.trim() || !form.lastName.trim()) return setError("Enter your first and last name.")
    const emailError = validateEmail(form.email)
    if (emailError) return setError(emailError)
    if (form.password.length < 8) return setError("Use at least 8 characters for your password.")
    setPending(true)
    const res = await register(form)
    if (!res.ok) {
      setError(res.error)
      setPending(false)
      return
    }
    router.replace(safeNext(next))
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field id="firstName" label="First name" autoComplete="given-name" value={form.firstName} onChange={set("firstName")} />
        <Field id="lastName" label="Last name" autoComplete="family-name" value={form.lastName} onChange={set("lastName")} />
      </div>
      <Field id="email" label="Email address" type="email" autoComplete="email" value={form.email} onChange={set("email")} />
      <Field id="password" label="Password (8+ characters)" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} />
      <div className="mt-2">
        <Submit pending={pending}>Create account</Submit>
      </div>
      <FormError message={error} />
    </form>
  )
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const emailError = validateEmail(email)
    if (emailError) return setError(emailError)
    setError(null)
    setPending(true)
    await requestPasswordReset(email)
    setPending(false)
    setSent(true)
  }

  if (sent) {
    return (
      <p className="text-center text-[15px] leading-[1.6] text-ink-2">
        If there’s an account for <strong className="text-ink">{email}</strong>, we’ve sent a link to reset
        the password. It works for 15 minutes.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3">
      <Field id="email" label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div className="mt-2">
        <Submit pending={pending}>Send reset link</Submit>
      </div>
      <FormError message={error} />
    </form>
  )
}

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError("Use at least 8 characters for your password.")
    if (password !== confirm) return setError("Those passwords don’t match.")
    setPending(true)
    const res = await resetPassword(token, email, password)
    setPending(false)
    if (!res.ok) return setError(res.error)
    setDone(true)
    // Sign straight in with the new password.
    const signedIn = await login(email, password)
    if (signedIn.ok) {
      router.replace("/account")
      router.refresh()
    }
  }

  if (done) {
    return <p className="text-center text-[15px] text-ink-2">Password updated. Taking you to your account…</p>
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3">
      <Field id="password" label="New password (8+ characters)" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Field id="confirm" label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <div className="mt-2">
        <Submit pending={pending}>Set new password</Submit>
      </div>
      <FormError message={error} />
    </form>
  )
}
