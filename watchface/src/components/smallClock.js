// The small clock at the top of the Today card: "5:02". Fixed-width digit slots like the big
// clock, so the always-on small clock (drawn by the system) matches it.
import ui from '@zos/ui'
import { F } from '../ui/theme.js'
import { text, cssTop, lineBox, setProps, setVisible, setAllVisible } from '../ui/widgets.js'
import { slotLayout } from '../ui/clockSlots.js'
import { SMALL_CLOCK } from '../ui/clockSizes.js'
import { hourText, pad } from './clock.js'

export function createSmallClock(color) {
  const { left, top, size } = SMALL_CLOCK
  const glyphs = [0, 1, 2, 3, 4].map(() =>
    text({ x: 0, y: cssTop(top, size, 1.2), w: 10, text_size: size, font: F.semibold, color, align_h: ui.align.CENTER_H }),
  )

  return {
    render({ now, is24 }) {
      const slots = slotLayout(`${hourText(now.hours, is24)}:${pad(now.minutes)}`, 'semibold', size, left)
      glyphs.forEach((w, i) => {
        setVisible(w, i < slots.length)
        if (i < slots.length) setProps(w, { x: slots[i].x, w: slots[i].w, h: lineBox(size), text: slots[i].ch })
      })
    },
    setVisible: (on) => setAllVisible(glyphs, on),
  }
}
