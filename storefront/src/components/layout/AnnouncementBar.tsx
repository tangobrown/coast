const DEFAULT_COPY = "Free UK delivery over £30 · Refills from £6 · Real fragrance, never fake"

export function AnnouncementBar() {
  const copy = process.env.NEXT_PUBLIC_ANNOUNCEMENT ?? DEFAULT_COPY
  if (!copy) return null
  return (
    <div className="bg-teal px-4 py-2.5 text-center text-[13px] tracking-[0.04em] text-teal-ink">
      {copy}
    </div>
  )
}
