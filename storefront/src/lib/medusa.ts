import "server-only"
import Medusa from "@medusajs/js-sdk"

export const MEDUSA_BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:9000"

// All Medusa calls happen on the server (Server Components + Server Actions),
// so the publishable key never has to be baked into the client bundle.
export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  publishableKey: process.env.MEDUSA_PUBLISHABLE_KEY,
  auth: { type: "session", jwtTokenStorageMethod: "nostore" },
})
