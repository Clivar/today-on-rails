// The small clock at the top of the Today card: "5:02". Fixed-width digit slots like the big
// clock, so the dim screen's small clock (drawn by the system) matches it.
import ui from '@zos/ui'
import { F } from '../ui/theme.js'
import { cssTop, lineBox, showAll } from '../ui/widgets.js'
import { slotLayout, glyphBox } from '../ui/clockSlots.js'
import { SMALL_CLOCK } from '../ui/clockSizes.js'
import { hourText, pad } from './clock.js'

export function createSmallClock(screen, color) {
  const { left, top, size } = SMALL_CLOCK
  const glyphs = [0, 1, 2, 3, 4].map(() =>
    screen.text({ x: 0, y: cssTop(top, size, 1.2), w: 10, text_size: size, font: F.semibold, color, align_h: ui.align.CENTER_H }),
  )

  return {
    render({ now, is24 }) {
      const slots = slotLayout(`${hourText(now.hours, is24)}:${pad(now.minutes)}`, 'semibold', size, left)
      for (let i = 0; i < glyphs.length; i++) {
        if (i >= slots.length) {
          glyphs[i].show(false)
          continue
        }
        const box = glyphBox(slots[i], size) // a fresh { x, w }: filled in, not copied (spreads are slow)
        box.h = lineBox(size)
        box.text = slots[i].ch
        glyphs[i].place(box)
      }
    },
    setVisible: (on) => showAll(glyphs, on),
  }
}
