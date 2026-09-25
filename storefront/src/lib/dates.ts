/**
 * "Fri 20 November 2026", in UK time. Built from parts so the server and the
 * browser always produce identical text (avoids hydration mismatches).
 */
export function formatDate(value: string | Date, withWeekday = false): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(new Date(value))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
  const date = `${get("day")} ${get("month")} ${get("year")}`
  return withWeekday ? `${get("weekday")} ${date}` : date
}
