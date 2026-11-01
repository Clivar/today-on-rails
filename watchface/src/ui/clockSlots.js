// Fixed-width digit slots ("tabular figures") for the clocks. The system's always-on clock
// (IMG_TIME) gives every digit the same width, so the normal clock does too: both line up exactly,
// and the time doesn't shift sideways when a digit changes. Also used by tools/gen-assets.js.
import { METRICS } from './metrics.js'

// Slot width per font, in em: Barlow Condensed digits are 0.39–0.46 em, Barlow SemiBold up to 0.585
const SLOT_EM = { digits: 0.44, semibold: 0.585 }

export const slotWidth = (font, size) => Math.round(SLOT_EM[font] * size)
export const colonWidth = (font, size) => Math.round(METRICS[font].widths[':'] * size)

// The text box for one glyph: the slot widened on both sides, same centre. Some digits ("0", "4")
// are a little wider than their slot; in a box narrower than the glyph the watch stops centring the
// text and shifts it, so those digits would slide sideways.
export function glyphBox(slot, size) {
  const pad = Math.ceil(size * 0.1)
  return { x: slot.x - pad, w: slot.w + 2 * pad }
}

// "21:13" → [{ ch, x, w }], left to right from `left`
export function slotLayout(time, font, size, left) {
  let x = left
  return [...time].map((ch) => {
    const w = ch === ':' ? colonWidth(font, size) : slotWidth(font, size)
    const slot = { ch, x, w }
    x += w
    return slot
  })
}
