import { freeShippingProgress } from "@/lib/money"

export function FreeShippingBar({
  subtotal,
  size = "sm",
}: {
  subtotal: number
  size?: "sm" | "md"
}) {
  const { message, percent } = freeShippingProgress(subtotal)
  return (
    <div>
      <div className={size === "md" ? "mb-2.5 text-sm" : "mb-2 text-[13.5px]"}>{message}</div>
      <div
        className={`overflow-hidden rounded-[10px] bg-line-soft ${size === "md" ? "h-1.5" : "h-[5px]"}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label="Progress towards free delivery"
      >
        <div
          className="h-full rounded-[10px] bg-teal transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
