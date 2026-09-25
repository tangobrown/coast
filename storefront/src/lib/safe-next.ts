/** Only allow post-login redirects to paths on this site (blocks "//evil.com"). */
export function safeNext(next: string | undefined, fallback = "/account"): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback
}
