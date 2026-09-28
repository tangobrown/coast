import type { Scent } from "./types"

/** A small, serialisable record per scent, searchable in the browser. */
export type SearchItem = {
  handle: string
  title: string
  line: string
  notes: string
  price: number | null
  thumbnail: string | null
  /** Lower-cased text everything is matched against. */
  text: string
}

const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

export function toSearchItems(scents: Scent[]): SearchItem[] {
  return scents.map((s) => ({
    handle: s.handle,
    title: s.title,
    line: s.line?.title ?? "",
    notes: s.shortNotes,
    price: s.full?.price ?? s.refill?.price ?? null,
    thumbnail: s.thumbnail,
    text: normalise(
      [
        s.title,
        s.line?.title,
        s.line?.format,
        s.shortNotes,
        s.notes.top,
        s.notes.heart,
        s.notes.base,
        s.description,
      ]
        .filter(Boolean)
        .join(" ")
    ),
  }))
}

/**
 * Every word in the query must appear (as the start of a word) somewhere in the
 * scent's name, line or notes. Name matches rank first.
 */
export function searchItems(items: SearchItem[], query: string): SearchItem[] {
  const words = normalise(query).split(" ").filter(Boolean)
  if (!words.length) return []
  const startsWord = (text: string, w: string) => text.startsWith(w) || text.includes(` ${w}`)

  return items
    .filter((item) => words.every((w) => startsWord(item.text, w)))
    .map((item) => {
      const title = normalise(item.title)
      const score = words.reduce((n, w) => n + (startsWord(title, w) ? 2 : 0) + (startsWord(normalise(item.line), w) ? 1 : 0), 0)
      return { item, score }
    })
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
}
