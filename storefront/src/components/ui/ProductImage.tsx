import Image from "next/image"

/**
 * Real photography will be supplied later. Until a product has an image we
 * show the stone placeholder from the design with a quiet label.
 */
export function ProductImage({
  src,
  alt,
  label,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  priority = false,
  className = "",
}: {
  src?: string | null
  alt: string
  label?: string
  sizes?: string
  priority?: boolean
  className?: string
}) {
  return (
    <div className={`relative overflow-hidden bg-stone ${className}`}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : label ? (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center font-serif text-lg italic text-muted-2/70">
          {label}
        </div>
      ) : null}
    </div>
  )
}
