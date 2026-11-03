// The big digital clock: "21:13" — white digits, lime colon; AM/PM small at the top right.
// Digits sit in fixed-width slots (ui/clockSlots.js) so the always-on clock, drawn by the system,
// matches it exactly. Place and size per layout: ui/clockSizes.js.
import ui from '@zos/ui'
import { C, F } from '../ui/theme.js'
import { trackedText, cssTop, lineBox, showAll } from '../ui/widgets.js'
import { slotLayout, glyphBox } from '../ui/clockSlots.js'
import { AMPM_SIZE } from '../ui/clockSizes.js'

export const pad = (n) => (n < 10 ? '0' : '') + n
export const hourText = (hours, is24) => (is24 ? pad(hours) : '' + (hours % 12 === 0 ? 12 : hours % 12))

export function createClock() {
  // Up to 4 digits and the colon, each in its own slot
  const glyphs = [0, 1, 2, 3].map(() =>
    trackedText({ x: 0, y: 0, w: 10, text_size: 156, font: F.digits, color: C.text, align_h: ui.align.CENTER_H }),
  )
  const colon = trackedText({ x: 0, y: 0, w: 10, text_size: 156, font: F.digits, color: C.lime, align_h: ui.align.CENTER_H })
  const ampm = trackedText({ x: 0, y: 0, w: 60, text_size: AMPM_SIZE, font: F.semibold, color: C.muted, align_h: ui.align.RIGHT })

  function render({ now, is24 }, { left, top, size, ampm: place }) {
    const y = cssTop(top, size, 0.9)
    const slots = slotLayout(`${hourText(now.hours, is24)}:${pad(now.minutes)}`, 'digits', size, left)
    let g = 0
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]
      const w = s.ch === ':' ? colon : glyphs[g++]
      const box = glyphBox(s, size) // a fresh { x, w }: filled in, not copied (spreads are slow)
      box.y = y
      box.h = lineBox(size)
      box.text = s.ch
      box.text_size = size
      w.place(box)
    }
    for (; g < glyphs.length; g++) glyphs[g].show(false)
    ampm.show(!is24)
    ampm.set({ x: place.right - 60, y: place.top, text: now.hours < 12 ? 'AM' : 'PM' })
  }

  const all = glyphs.concat(colon, ampm)
  return { render, setVisible: (on) => showAll(all, on) }
}
