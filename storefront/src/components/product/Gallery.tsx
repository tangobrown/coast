"use client"

import { useState } from "react"
import { ProductImage } from "../ui/ProductImage"

const PLACEHOLDER_LABELS = ["In the car", "Detail", "Notes / ingredients"]

export function Gallery({ title, images }: { title: string; images: string[] }) {
  const [active, setActive] = useState(0)
  // Always show a main image + 3 thumbnails, as in the design.
  const slots = Array.from({ length: 4 }, (_, i) => images[i] ?? null)
  const thumbs = slots.map((src, i) => ({ src, i })).filter(({ i }) => i !== active)

  return (
    <div className="grid gap-3">
      <ProductImage
        src={slots[active]}
        alt={title}
        label={`${title} — hero shot`}
        sizes="(min-width: 1024px) 50vw, 100vw"
        priority
        className="aspect-square rounded-[10px]"
      />
      <div className="grid grid-cols-3 gap-3">
        {thumbs.slice(0, 3).map(({ src, i }, n) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Show image ${i + 1} of ${title}`}
            className="block rounded-lg"
          >
            <ProductImage
              src={src}
              alt=""
              label={src ? undefined : PLACEHOLDER_LABELS[n]}
              sizes="(min-width: 1024px) 16vw, 33vw"
              className="aspect-square rounded-lg"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
