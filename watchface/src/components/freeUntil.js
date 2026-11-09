// "○ Free until Monday 10:00" under the big clock (the "clear" layout), or, when the phone's updates
// have stopped, "No update since Sat 18:08" in orange: "Nothing planned" could be wrong then.
import ui from '@zos/ui'
import { C, F } from '../ui/theme.js'
import { cssTop, showAll } from '../ui/widgets.js'
import { textWidth } from '../ui/text.js'
import { freeUntil, freeUntilShort, staleNotice } from '../data/agenda.js'

const TOP = 284
const MAX_W = 290

export function createFreeUntil(screen, color = C.muted) {
  const alert = screen.name === 'dim' ? C.dimAlert : C.alert
  const ring = screen.widget(ui.widget.CIRCLE, { center_x: 45, center_y: TOP + 12, radius: 5, color })
  const hole = screen.widget(ui.widget.CIRCLE, { center_x: 45, center_y: TOP + 12, radius: 3, color: C.bg })
  const label = screen.text({ x: 60, y: cssTop(TOP, 20, 1.2), w: 300, text_size: 20, font: F.medium, color })

  return {
    render({ agenda, subject, is24, now }) {
      const stale = staleNotice(agenda, now, is24)
      if (stale) return label.set({ text: stale, color: alert })
      const full = freeUntil(agenda, subject, is24)
      label.set({ text: textWidth(full, 'medium', 20) <= MAX_W ? full : freeUntilShort(agenda, subject), color })
    },
    setVisible: (on) => showAll([ring, hole, label], on),
  }
}
