// Always-on: one line with the next event, "● 6:00 PM · Water the plants".
import ui from '@zos/ui'
import { C, F } from '../ui/theme.js'
import { trackedWidget, trackedText, cssTop, showAll } from '../ui/widgets.js'
import { fitText } from '../ui/text.js'
import { formatTime, formatWhen } from '../data/agenda.js'

const TOP = 250

export function createAlwaysOnLine() {
  const dot = trackedWidget(ui.widget.CIRCLE, { center_x: 45, center_y: TOP + 13, radius: 5, color: C.aodLime })
  const label = trackedText({ x: 60, y: cssTop(TOP, 22, 1.2), w: 290, text_size: 22, font: F.semibold, color: C.aodText })
  const parts = [dot, label]
  let enabled = true
  return {
    setVisible: (on) => {
      enabled = on
      showAll(parts, on)
    },
    render({ subject, is24 }) {
      if (!enabled) return
      showAll(parts, subject)
      if (!subject) return
      const when = subject.ongoing ? `Until ${formatTime(subject.endHours, subject.endMinutes, is24)}` : formatWhen(subject, is24)
      label.setText(fitText(`${when} · ${subject.title}`, 'semibold', 22, 290))
    },
  }
}
