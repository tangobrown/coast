// Email templates in the Coast style. Inline styles only — most email clients
// ignore <style> blocks. Every template returns HTML plus a plain-text version.

const C = {
  sand: "#F3EEE4",
  paper: "#FBF9F5",
  line: "#DDD5C6",
  ink: "#201D1A",
  ink2: "#5A544A",
  muted: "#6B655C",
  teal: "#2E4B4E",
}
const SERIF = "'Instrument Serif', Georgia, 'Times New Roman', serif"
const SANS = "'Hanken Grotesk', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

export function formatMoney(amount: unknown): string {
  const n = Math.round(Number(amount ?? 0) * 100) / 100
  return "£" + (Number.isInteger(n) ? String(n) : n.toFixed(2))
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

function layout(preheader: string, body: string, storefrontUrl: string) {
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Coast</title></head>
<body style="margin:0;padding:0;background:${C.sand};">
<div style="display:none;max-height:0;overflow:hidden;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.sand};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
    <tr><td style="padding:0 0 24px;font-family:${SERIF};font-size:32px;color:${C.ink};">
      <a href="${esc(storefrontUrl)}" style="color:${C.ink};text-decoration:none;">Coast</a>
    </td></tr>
    <tr><td style="background:${C.paper};border-radius:10px;padding:36px 32px;font-family:${SANS};color:${C.ink};">
      ${body}
    </td></tr>
    <tr><td style="padding:24px 4px;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.muted};">
      Real fragrance for the car. Made in the UK, built to be refilled.<br>
      Coast Fragrances · <a href="${esc(storefrontUrl)}" style="color:${C.muted};">coastfragrances.co.uk</a>
    </td></tr>
  </table>
</td></tr></table></body></html>`
}

type OrderItem = { title: string; subtitle: string; quantity: number; total: number }
type OrderData = {
  display_id: number | string
  items: OrderItem[]
  subtotal: number
  shipping_total: number
  discount_total: number
  total: number
  shipping_method?: string
  shipping_address?: string[]
  refill_reminders?: boolean
  storefront_url: string
}

function orderPlaced(d: OrderData) {
  const rows = d.items
    .map(
      (i) => `<tr>
        <td style="padding:12px 0;border-bottom:1px solid ${C.line};font-size:15px;">
          <div style="font-weight:600;">${esc(i.title)} <span style="color:${C.muted};font-weight:400;">× ${i.quantity}</span></div>
          <div style="font-size:13px;color:${C.muted};">${esc(i.subtitle)}</div>
        </td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid ${C.line};font-size:15px;font-weight:600;white-space:nowrap;">${formatMoney(i.total)}</td>
      </tr>`
    )
    .join("")
  const line = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:4px 0;font-size:${strong ? 17 : 15}px;${strong ? "font-weight:600;" : `color:${C.ink2};`}">${label}</td>
     <td align="right" style="padding:4px 0;font-size:${strong ? 17 : 15}px;${strong ? "font-weight:600;" : `color:${C.ink2};`}">${value}</td></tr>`

  const body = `
    <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:${C.muted};margin-bottom:12px;">Order #CF${esc(d.display_id)}</div>
    <h1 style="margin:0 0 14px;font-family:${SERIF};font-weight:400;font-size:36px;line-height:1.05;">Thank you. <em style="color:${C.teal};">Something real</em> is on its way.</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${C.ink2};">We’ll send tracking once it’s packed${d.refill_reminders ? " — and a gentle nudge when it’s time for a refill" : ""}.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line};">${rows}</table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
      ${line("Subtotal", formatMoney(d.subtotal))}
      ${d.discount_total > 0 ? line("Discount", "−" + formatMoney(d.discount_total)) : ""}
      ${line("Delivery", d.shipping_total > 0 ? formatMoney(d.shipping_total) : "Free")}
      ${line("Total", formatMoney(d.total), true)}
    </table>
    ${
      d.shipping_address?.length
        ? `<div style="margin-top:26px;padding-top:20px;border-top:1px solid ${C.line};font-size:14px;line-height:1.6;color:${C.ink2};">
             <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${C.muted};margin-bottom:6px;">Delivering to</div>
             ${d.shipping_address.map(esc).join("<br>")}
             ${d.shipping_method ? `<div style="margin-top:8px;">${esc(d.shipping_method)}</div>` : ""}
           </div>`
        : ""
    }
    <div style="margin-top:30px;">
      <a href="${esc(d.storefront_url)}/shop" style="display:inline-block;background:${C.ink};color:${C.paper};text-decoration:none;font-weight:600;font-size:15px;padding:14px 30px;border-radius:100px;">Continue shopping</a>
    </div>`

  const text = [
    `Order #CF${d.display_id}`,
    "Thank you. Something real is on its way.",
    "",
    ...d.items.map((i) => `${i.title} (${i.subtitle}) x${i.quantity} — ${formatMoney(i.total)}`),
    "",
    `Subtotal: ${formatMoney(d.subtotal)}`,
    ...(d.discount_total > 0 ? [`Discount: -${formatMoney(d.discount_total)}`] : []),
    `Delivery: ${d.shipping_total > 0 ? formatMoney(d.shipping_total) : "Free"}`,
    `Total: ${formatMoney(d.total)}`,
    ...(d.shipping_address?.length ? ["", "Delivering to:", ...d.shipping_address] : []),
    "",
    d.storefront_url,
  ].join("\n")

  return {
    subject: `Your Coast order #CF${d.display_id}`,
    html: layout(`Order #CF${d.display_id} confirmed — ${formatMoney(d.total)}`, body, d.storefront_url),
    text,
  }
}

function button(href: string, label: string) {
  return `<a href="${esc(href)}" style="display:inline-block;background:${C.ink};color:${C.paper};text-decoration:none;font-weight:600;font-size:15px;padding:14px 30px;border-radius:100px;">${esc(label)}</a>`
}

function simple(opts: {
  subject: string
  heading: string
  paragraphs: string[]
  cta?: { href: string; label: string }
  footnote?: string
  storefront_url: string
}) {
  const body = `
    <h1 style="margin:0 0 16px;font-family:${SERIF};font-weight:400;font-size:34px;line-height:1.05;">${opts.heading}</h1>
    ${opts.paragraphs.map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${C.ink2};">${p}</p>`).join("")}
    ${opts.cta ? `<div style="margin-top:26px;">${button(opts.cta.href, opts.cta.label)}</div>` : ""}
    ${opts.footnote ? `<p style="margin:26px 0 0;font-size:13px;line-height:1.6;color:${C.muted};">${opts.footnote}</p>` : ""}`
  const strip = (s: string) => s.replace(/<[^>]+>/g, "")
  const text = [strip(opts.heading), "", ...opts.paragraphs.map(strip), ...(opts.cta ? ["", `${opts.cta.label}: ${opts.cta.href}`] : []), ...(opts.footnote ? ["", strip(opts.footnote)] : [])].join("\n")
  return { subject: opts.subject, html: layout(strip(opts.paragraphs[0] ?? ""), body, opts.storefront_url), text }
}

export function renderEmail(template: string, data: Record<string, unknown>) {
  const d = data as Record<string, any>
  switch (template) {
    case "order-placed":
      return orderPlaced(data as unknown as OrderData)
    case "password-reset":
      return simple({
        subject: "Reset your Coast password",
        heading: "Reset your password",
        paragraphs: ["Someone (hopefully you) asked to reset the password for your Coast account. The link below works for the next 15 minutes."],
        cta: { href: d.reset_url, label: "Choose a new password" },
        footnote: "If you didn’t ask for this, you can ignore this email — your password won’t change.",
        storefront_url: d.storefront_url,
      })
    case "subscription-payment-failed":
      return simple({
        subject: "We couldn’t take payment for your Coast refill",
        heading: `Your <em style="color:${C.teal};">${esc(d.product_title)}</em> refill is on hold`,
        paragraphs: [
          `We tried to take ${esc(formatMoney(d.amount))} for your next refill, but the payment didn’t go through${d.reason ? ` (${esc(d.reason)})` : ""}.`,
          "Update your card in your account and we’ll send it straight out. We’ll also try again automatically in a few days.",
        ],
        cta: { href: `${d.storefront_url}/account/subscriptions`, label: "Update payment details" },
        storefront_url: d.storefront_url,
      })
    default:
      throw new Error(`Unknown email template: ${template}`)
  }
}
