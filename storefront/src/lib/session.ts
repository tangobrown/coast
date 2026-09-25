import "server-only"
import { cookies } from "next/headers"

// The customer's Medusa login token lives in an httpOnly cookie, so page
// scripts can never read it. Server code attaches it to backend calls.
const AUTH_COOKIE = "_coast_jwt"

export async function getAuthToken() {
  return (await cookies()).get(AUTH_COOKIE)?.value
}

export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken()
  return token ? { authorization: `Bearer ${token}` } : {}
}

export async function setAuthToken(token: string) {
  ;(await cookies()).set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function clearAuthToken() {
  ;(await cookies()).delete(AUTH_COOKIE)
}
