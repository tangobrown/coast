// Placeholder catalogue from the design handoff. Edit freely in the Medusa
// admin once seeded — this file is only used for the first seed.

export type LineHandle = "hang" | "stick" | "clip"

export const LINES: {
  handle: LineHandle
  title: string
  metadata: {
    format: string
    life: string
    intro: string
    desc: string
    how_to_use: string
    sort: number
  }
}[] = [
  {
    handle: "hang",
    title: "Hang",
    metadata: {
      sort: 1,
      format: "Mirror bottle",
      life: "10ml glass bottle · ~6 weeks per fill",
      intro:
        "Little cologne bottles in real glass that hang from the rear-view mirror. Tip the wooden cap to release, top up when it runs low.",
      desc: "A weighted glass bottle on a cotton cord, with a wooden cap that diffuses slowly into the cabin.",
      how_to_use:
        "Hang from the mirror stem. Tip the bottle once so the wooden cap takes on a little oil — do it again whenever you want a lift.",
    },
  },
  {
    handle: "stick",
    title: "Stick",
    metadata: {
      sort: 2,
      format: "Console slab",
      life: "Solid oak slab · ~8 weeks per fill",
      intro:
        "Scented wooden slabs that fix flat to the centre console. Solid oak soaks up the oil and releases it slowly and evenly.",
      desc: "A solid oak slab with a discreet adhesive pad. Re-scent it with a few drops from the refill vial.",
      how_to_use:
        "Peel the pad and press the slab onto a clean, flat part of the console. Add 4–5 drops from a refill vial to re-scent.",
    },
  },
  {
    handle: "clip",
    title: "Clip",
    metadata: {
      sort: 3,
      format: "Vent clip",
      life: "Aluminium clip · ~4 weeks per fill",
      intro:
        "Clips onto the air-con vent so the airflow carries the scent. Turn it up on the motorway, back down in town.",
      desc: "A brushed-aluminium clip with a replaceable scented core, sized to fit almost every vent.",
      how_to_use:
        "Push the clip onto a horizontal vent slat. Open the vent for more scent, close it for less. Swap the core when it fades.",
    },
  },
]

export const SCENTS: {
  handle: string
  title: string
  line: LineHandle
  full: number
  refill: number
  short_notes: string
  top: string
  heart: string
  base: string
  bestseller?: boolean
}[] = [
  { handle: "sea-salt-driftwood", title: "Sea Salt & Driftwood", line: "hang", full: 16, refill: 7, short_notes: "Sea salt, driftwood, a clean mineral wind.", top: "Sea salt, bergamot", heart: "Driftwood, sage", base: "Ambergris, musk", bestseller: true },
  { handle: "cedar-smoke", title: "Cedar & Smoke", line: "hang", full: 16, refill: 7, short_notes: "Dry cedar, a curl of woodsmoke, warm amber.", top: "Pink pepper", heart: "Atlas cedar, birch smoke", base: "Amber, labdanum", bestseller: true },
  { handle: "neroli-linen", title: "Neroli & Linen", line: "hang", full: 16, refill: 7, short_notes: "Neroli blossom, clean cotton, soft white musk.", top: "Neroli, petitgrain", heart: "Orange flower", base: "White musk, cashmeran" },
  { handle: "fig-vetiver", title: "Fig & Vetiver", line: "stick", full: 14, refill: 6, short_notes: "Green fig, earthy vetiver, cut grass.", top: "Fig leaf, grass", heart: "Fig milk", base: "Haitian vetiver", bestseller: true },
  { handle: "amber-dusk", title: "Amber Dusk", line: "stick", full: 14, refill: 6, short_notes: "Soft amber, tonka, a little leather.", top: "Mandarin", heart: "Leather, iris", base: "Amber, tonka bean" },
  { handle: "oak-tobacco-leaf", title: "Oak & Tobacco Leaf", line: "stick", full: 14, refill: 6, short_notes: "Toasted oak, dried tobacco leaf, honey.", top: "Cardamom", heart: "Tobacco leaf, honey", base: "Oak, sandalwood" },
  { handle: "eucalyptus-mist", title: "Eucalyptus Mist", line: "clip", full: 12, refill: 6, short_notes: "Cool eucalyptus, mint, wet stone.", top: "Eucalyptus, spearmint", heart: "Rosemary", base: "Mineral accord" },
  { handle: "bergamot-grove", title: "Bergamot Grove", line: "clip", full: 12, refill: 6, short_notes: "Bergamot, neroli, sun-warmed citrus leaf.", top: "Bergamot, lemon", heart: "Neroli, citrus leaf", base: "Vetiver", bestseller: true },
  { handle: "black-tea-fig-leaf", title: "Black Tea & Fig Leaf", line: "clip", full: 12, refill: 6, short_notes: "Smoky black tea, green fig leaf, a hint of lemon.", top: "Lemon zest", heart: "Lapsang tea", base: "Fig leaf, cedar" },
]
