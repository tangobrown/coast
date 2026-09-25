import { eyebrow } from "../ui/styles"

export function AuthShell({
  kicker,
  title,
  intro,
  children,
  footer,
}: {
  kicker: string
  title: React.ReactNode
  intro?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-[480px] px-page pb-24 pt-10">
      <div className="mb-8 text-center">
        <div className={`mb-4 ${eyebrow}`}>{kicker}</div>
        <h1 className="mb-3 font-serif text-[clamp(40px,5vw,56px)] font-normal leading-none">{title}</h1>
        {intro && <p className="text-[16px] leading-[1.6] text-ink-2">{intro}</p>}
      </div>
      <div className="rounded-[10px] bg-paper p-[clamp(22px,4vw,34px)]">{children}</div>
      {footer && <div className="mt-6 text-center text-[15px] text-ink-2">{footer}</div>}
    </div>
  )
}
