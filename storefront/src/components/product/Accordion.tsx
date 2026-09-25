"use client"

import { useId, useState } from "react"

export function Accordion({ items }: { items: { title: string; body: string }[] }) {
  const [open, setOpen] = useState(0)
  const id = useId()
  return (
    <div className="border-t border-line">
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div key={item.title} className="border-b border-line">
            <h3>
              <button
                type="button"
                id={`${id}-h-${i}`}
                aria-expanded={isOpen}
                aria-controls={`${id}-p-${i}`}
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="flex w-full items-center justify-between py-[18px] text-left text-[15px] font-semibold text-ink transition-colors hover:text-teal"
              >
                <span>{item.title}</span>
                <span aria-hidden className="text-xl font-normal">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            </h3>
            <div
              id={`${id}-p-${i}`}
              role="region"
              aria-labelledby={`${id}-h-${i}`}
              hidden={!isOpen}
            >
              <p className="mb-[18px] text-[15px] leading-[1.6] text-ink-2">{item.body}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
