// "○ Free until Monday 10:00" under the big clock (the "clear" layout).
import ui from '@zos/ui'
import { C, F } from '../ui/theme.js'
import { widget, text, cssTop, setText, setAllVisible } from '../ui/widgets.js'
import { textWidth } from '../ui/text.js'
import { freeUntil, freeUntilShort } from '../data/agenda.js'

const TOP = 284
const MAX_W = 290

export function createFreeUntil(color = C.muted) {
  const ring = widget(ui.widget.CIRCLE, { center_x: 45, center_y: TOP + 12, radius: 5, color })
  const hole = widget(ui.widget.CIRCLE, { center_x: 45, center_y: TOP + 12, radius: 3, color: C.bg })
  const label = text({ x: 60, y: cssTop(TOP, 20, 1.2), w: 300, text_size: 20, font: F.medium, color })

  return {
    render({ agenda, subject, is24 }) {
      const full = freeUntil(agenda, subject, is24)
      setText(label, textWidth(full, 'medium', 20) <= MAX_W ? full : freeUntilShort(agenda, subject))
    },
    setVisible: (on) => setAllVisible([ring, hole, label], on),
  }
}
