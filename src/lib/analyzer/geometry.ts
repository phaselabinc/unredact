import type {BBox} from './types'

/** Area of a box; 0 if degenerate. */
export function area(b: BBox): number {
  return Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1])
}

export function width(b: BBox): number {
  return Math.max(0, b[2] - b[0])
}

export function height(b: BBox): number {
  return Math.max(0, b[3] - b[1])
}

/** Intersection box, or null if they don't overlap. */
export function intersection(a: BBox, b: BBox): BBox | null {
  const x0 = Math.max(a[0], b[0])
  const y0 = Math.max(a[1], b[1])
  const x1 = Math.min(a[2], b[2])
  const y1 = Math.min(a[3], b[3])
  if (x1 <= x0 || y1 <= y0) return null
  return [x0, y0, x1, y1]
}

/** Fraction of `inner` that lies inside `outer` (0..1). */
export function coverage(inner: BBox, outer: BBox): number {
  const a = area(inner)
  if (a <= 0) return 0
  const i = intersection(inner, outer)
  return i ? area(i) / a : 0
}

/** Union of two boxes. */
export function union(a: BBox, b: BBox): BBox {
  return [
    Math.min(a[0], b[0]),
    Math.min(a[1], b[1]),
    Math.max(a[2], b[2]),
    Math.max(a[3], b[3]),
  ]
}

/** Do two boxes share roughly the same text baseline (vertical overlap)? */
export function sameLine(a: BBox, b: BBox): boolean {
  const overlap = Math.min(a[3], b[3]) - Math.max(a[1], b[1])
  const minH = Math.min(height(a), height(b))
  return minH > 0 && overlap / minH > 0.4
}

/** Normalize any [x0,y0,x1,y1] so that x0<=x1 and y0<=y1. */
export function normalize(b: BBox): BBox {
  return [
    Math.min(b[0], b[2]),
    Math.min(b[1], b[3]),
    Math.max(b[0], b[2]),
    Math.max(b[1], b[3]),
  ]
}
