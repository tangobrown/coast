/**
 * Editorial images that aren't attached to a product.
 *
 * Drop files into /public/images and set the paths here, e.g.
 *   homeHero: "/images/home-hero.jpg"
 * Any image left as null shows the stone placeholder from the design.
 * Product photos are uploaded per product in the Medusa admin instead.
 */
export const SITE_IMAGES: {
  homeHero: string | null
  lines: Record<string, string | null>
  storyHero: string | null
  storyRefill: string | null
} = {
  homeHero: null,
  lines: {
    hang: null,
    stick: null,
    clip: null,
  },
  storyHero: null,
  storyRefill: null,
}
