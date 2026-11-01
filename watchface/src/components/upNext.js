// The Today card's list: the next two items after the event shown ("● 7:30 Walk the dog").
import ui from '@zos/ui'
import { C, F } from '../ui/theme.js'
import { widget, text, cssTop, setProps, setVisible, setAllVisible } from '../ui/widgets.js'
import { textWidth, fitText } from '../ui/text.js'
import { formatTime, itemsAfter } from '../data/agenda.js'

const TOP = 332
const ROW = 21 * 1.2 + 10
const RIGHT = 286 // stay clear of the record button

export function createUpNext() {
  const rows = [0, 1].map((i) => {
    const cy = Math.round(TOP + i * ROW + 12.6)
    return {
      dot: widget(ui.widget.CIRCLE, { center_x: 45, center_y: cy, radius: 5, color: C.muted }),
      ring: widget(ui.widget.CIRCLE, { center_x: 45, center_y: cy, radius: 5, color: C.text }),
      hole: widget(ui.widget.CIRCLE, { center_x: 45, center_y: cy, radius: 3, color: C.bg }),
      time: text({ x: 60, y: cssTop(TOP + i * ROW, 21, 1.2), w: 70, text_size: 21, font: F.semibold, color: C.muted }),
      title: text({ x: 114, y: cssTop(TOP + i * ROW, 21, 1.2), w: 180, text_size: 21, font: F.medium, color: C.text }),
    }
  })

  function render({ agenda, subject, is24 }) {
    const items = itemsAfter(agenda, subject, 2)
    // Time column: 44 px in the design (12-hour "7:30"); wider for 24-hour "09:00"
    const times = items.map((it) => formatTime(it.hours, it.minutes, is24, false))
    const timeW = Math.max(44, ...times.map((t) => textWidth(t, 'semibold', 21)))
    rows.forEach((row, i) => {
      const it = items[i]
      // Reminders are grey dots, calendar events white rings
      const ring = !!it && it.kind === 'calendar'
      setVisible(row.dot, !!it && !ring)
      setAllVisible([row.ring, row.hole], ring)
      setAllVisible([row.time, row.title], !!it)
      if (!it) return
      setProps(row.time, { text: times[i] })
      const x = 60 + timeW + 10
      setProps(row.title, { x, w: RIGHT - x, text: fitText(it.title, 'medium', 21, RIGHT - x) })
    })
  }

  return {
    render,
    setVisible: (on) => rows.forEach((r) => setAllVisible([r.dot, r.ring, r.hole, r.time, r.title], on)),
  }
}
