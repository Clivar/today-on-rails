// The big digital clock: "21:13" — white digits, lime colon; AM/PM small at the top right.
// Digits sit in fixed-width slots (ui/clockSlots.js) so the always-on clock, drawn by the system,
// matches it exactly. Place and size per layout: ui/clockSizes.js.
import ui from '@zos/ui'
import { C, F } from '../ui/theme.js'
import { text, cssTop, lineBox, setProps, setVisible, setAllVisible } from '../ui/widgets.js'
import { slotLayout } from '../ui/clockSlots.js'
import { AMPM_SIZE } from '../ui/clockSizes.js'

export const pad = (n) => (n < 10 ? '0' : '') + n
export const hourText = (hours, is24) => (is24 ? pad(hours) : '' + (hours % 12 === 0 ? 12 : hours % 12))

export function createClock() {
  // Up to 4 digits and the colon, each in its own slot
  const glyphs = [0, 1, 2, 3].map(() =>
    text({ x: 0, y: 0, w: 10, text_size: 156, font: F.digits, color: C.text, align_h: ui.align.CENTER_H }),
  )
  const colon = text({ x: 0, y: 0, w: 10, text_size: 156, font: F.digits, color: C.lime, align_h: ui.align.CENTER_H })
  const ampm = text({ x: 0, y: 0, w: 60, text_size: AMPM_SIZE, font: F.semibold, color: C.muted, align_h: ui.align.RIGHT })

  function render({ now, is24 }, { left, top, size, ampm: place }) {
    const y = cssTop(top, size, 0.9)
    const slots = slotLayout(`${hourText(now.hours, is24)}:${pad(now.minutes)}`, 'digits', size, left)
    let g = 0
    for (const s of slots) {
      const w = s.ch === ':' ? colon : glyphs[g++]
      setProps(w, { x: s.x, y, w: s.w, h: lineBox(size), text: s.ch, text_size: size })
      setVisible(w, true)
    }
    for (; g < glyphs.length; g++) setVisible(glyphs[g], false)
    setVisible(ampm, !is24)
    setProps(ampm, { x: place.right - 60, y: place.top, text: now.hours < 12 ? 'AM' : 'PM' })
  }

  return { render, setVisible: (on) => setAllVisible([...glyphs, colon, ampm], on) }
}
