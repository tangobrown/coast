"use client"

const sizes = {
  lg: { btn: "h-[54px] w-12 text-xl", value: "min-w-[26px]", wrap: "bg-paper" },
  md: { btn: "h-10 w-[38px] text-[17px]", value: "min-w-5 text-sm", wrap: "bg-paper" },
  sm: { btn: "h-8 w-8 text-sm", value: "min-w-4 text-[13px]", wrap: "" },
}

export function QtyStepper({
  value,
  onChange,
  min = 0,
  size = "md",
  disabled = false,
  label = "Quantity",
}: {
  value: number
  onChange: (next: number) => void
  min?: number
  size?: keyof typeof sizes
  disabled?: boolean
  label?: string
}) {
  const s = sizes[size]
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex items-center rounded-full border border-input-border ${s.wrap}`}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
        className={`${s.btn} rounded-l-full text-ink disabled:opacity-40`}
      >
        −
      </button>
      <div className={`${s.value} text-center font-semibold`} aria-live="polite">
        {value}
      </div>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
        className={`${s.btn} rounded-r-full text-ink disabled:opacity-40`}
      >
        +
      </button>
    </div>
  )
}
