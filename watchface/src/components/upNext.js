// The Today card's list: the next two items after the event shown ("● 7:30 Walk the dog").
import ui from '@zos/ui'
import { C, F } from '../ui/theme.js'
import { trackedWidget, trackedText, cssTop, showAll } from '../ui/widgets.js'
import { textWidth, fitText } from '../ui/text.js'
import { formatTime, itemsAfter } from '../data/agenda.js'

const TOP = 332
const ROW = 21 * 1.2 + 10
const RIGHT = 286 // stay clear of the record button

export function createUpNext() {
  const rows = [0, 1].map((i) => {
    const cy = Math.round(TOP + i * ROW + 12.6)
    return {
      dot: trackedWidget(ui.widget.CIRCLE, { center_x: 45, center_y: cy, radius: 5, color: C.muted }),
      ring: trackedWidget(ui.widget.CIRCLE, { center_x: 45, center_y: cy, radius: 5, color: C.text }),
      hole: trackedWidget(ui.widget.CIRCLE, { center_x: 45, center_y: cy, radius: 3, color: C.bg }),
      time: trackedText({ x: 60, y: cssTop(TOP + i * ROW, 21, 1.2), w: 70, text_size: 21, font: F.semibold, color: C.muted }),
      title: trackedText({ x: 114, y: cssTop(TOP + i * ROW, 21, 1.2), w: 180, text_size: 21, font: F.medium, color: C.text }),
    }
  })

  function render({ agenda, subject, is24 }) {
    const items = itemsAfter(agenda, subject, 2)
    // Time column: 44 px in the design (12-hour "7:30"); wider for 24-hour "09:00"
    const times = []
    let timeW = 44
    for (let i = 0; i < items.length; i++) {
      times.push(formatTime(items[i].hours, items[i].minutes, is24, false))
      timeW = Math.max(timeW, textWidth(times[i], 'semibold', 21))
    }
    const x = 60 + timeW + 10
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const it = items[i]
      // Reminders are grey dots, calendar events white rings
      const ring = !!it && it.kind === 'calendar'
      row.dot.show(it && !ring)
      row.ring.show(ring)
      row.hole.show(ring)
      row.time.show(it)
      row.title.show(it)
      if (!it) continue
      row.time.setText(times[i])
      row.title.set({ x, w: RIGHT - x, text: fitText(it.title, 'medium', 21, RIGHT - x) })
    }
  }

  const all = []
  for (let i = 0; i < rows.length; i++) all.push(rows[i].dot, rows[i].ring, rows[i].hole, rows[i].time, rows[i].title)
  return { render, setVisible: (on) => showAll(all, on) }
}
