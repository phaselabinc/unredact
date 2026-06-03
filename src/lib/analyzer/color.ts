import {DARK_LUMA_MAX} from './constants'

export type RGB = [r: number, g: number, b: number] // each 0..255

/** Rec. 601 luma. */
export function luma([r, g, b]: RGB): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/** Is this fill dark enough to plausibly be a black redaction box? */
export function isDark(rgb: RGB): boolean {
  return luma(rgb) <= DARK_LUMA_MAX
}

export function grayToRgb(g: number): RGB {
  const v = clamp255(g * 255)
  return [v, v, v]
}

export function rgbFromUnit(r: number, g: number, b: number): RGB {
  return [clamp255(r * 255), clamp255(g * 255), clamp255(b * 255)]
}

/** Naive CMYK→RGB (good enough for "is it dark?"). Inputs 0..1. */
export function cmykToRgb(c: number, m: number, y: number, k: number): RGB {
  return [
    clamp255(255 * (1 - c) * (1 - k)),
    clamp255(255 * (1 - m) * (1 - k)),
    clamp255(255 * (1 - y) * (1 - k)),
  ]
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)))
}
