// The Today card's list: the next two items after the event shown ("● 7:30 Walk the dog", on another
// day "● Tomorrow 9:00 Dentist"); when the phone's updates have stopped, "No update since Sat 18:08" in
// orange instead (the list could be wrong).
import ui from '@zos/ui'
import { C, F } from '../ui/theme.js'
import { cssTop, showAll } from '../ui/widgets.js'
import { textWidth, fitText } from '../ui/text.js'
import { lazy } from '../ui/lazy.js'
import { formatWhen, itemsAfter, staleNotice } from '../data/agenda.js'

const TOP = 332
const ROW = 21 * 1.2 + 10
// Right edge of the text: clear of the rounded corner and the rail's 4 o'clock tick (x 357)
const RIGHT = 340

export function createUpNext(screen) {
  const rows = [0, 1].map((i) => {
    const cy = Math.round(TOP + i * ROW + 12.6)
    return {
      dot: screen.widget(ui.widget.CIRCLE, { center_x: 45, center_y: cy, radius: 5, color: C.muted }),
      ring: screen.widget(ui.widget.CIRCLE, { center_x: 45, center_y: cy, radius: 5, color: C.text }),
      hole: screen.widget(ui.widget.CIRCLE, { center_x: 45, center_y: cy, radius: 3, color: C.bg }),
      time: screen.text({ x: 60, y: cssTop(TOP + i * ROW, 21, 1.2), w: 70, text_size: 21, font: F.semibold, color: C.muted }),
      title: screen.text({ x: 114, y: cssTop(TOP + i * ROW, 21, 1.2), w: 180, text_size: 21, font: F.medium, color: C.text }),
    }
  })

  // Made the first time it's needed (rarely: only when updates stop)
  const notice = lazy(() => screen.text({ x: 40, y: cssTop(TOP, 18, 1.2), w: RIGHT - 40, text_size: 18, font: F.medium, color: C.alert }))
  let noticeMade = false

  function render({ agenda, subject, is24, now }) {
    const stale = staleNotice(agenda, now, is24)
    if (stale) {
      notice().place({ text: stale })
      noticeMade = true
    } else if (noticeMade) {
      notice().show(false)
    }
    const items = stale ? [] : itemsAfter(agenda, subject, 2)
    // Time column: 44 px in the design (12-hour "7:30"); wider for 24-hour "09:00" or another day
    const times = []
    let timeW = 44
    for (let i = 0; i < items.length; i++) {
      times.push(formatWhen(items[i], is24, false))
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
      row.time.set({ w: timeW + 10, text: times[i] }) // a box narrower than its text shifts it
      row.title.set({ x, w: RIGHT - x, text: fitText(it.title, 'medium', 21, RIGHT - x) })
    }
  }

  const all = []
  for (let i = 0; i < rows.length; i++) all.push(rows[i].dot, rows[i].ring, rows[i].hole, rows[i].time, rows[i].title)
  return {
    render,
    setVisible: (on) => {
      showAll(all, on)
      if (noticeMade && !on) notice().show(false) // shown again by the next render, if still stale
    },
  }
}
