// The "next" layout's event block:
//   upcoming: "6:00 PM · IN 58 MIN" / title / "+2 more today"
//   ongoing:  "NOW · 25 MIN LEFT" / title / "Until 10:30 · +2 more today"
//   last 5 minutes: "WRAP IT UP · 4 MIN LEFT" in orange
import { C, F } from '../ui/theme.js'
import { cssTop, showAll } from '../ui/widgets.js'
import { fitText } from '../ui/text.js'
import { eventLabel, formatTime, moreSameDay } from '../data/agenda.js'

export function createNextEvent(screen) {
  const when = screen.text({ x: 40, y: cssTop(238, 16, 1.2), w: 330, text_size: 16, font: F.bold, color: C.lime, char_space: 2 })
  const title = screen.text({ x: 40, y: cssTop(263, 34, 1.1), w: 320, text_size: 34, font: F.bold, color: C.text })
  const more = screen.text({ x: 40, y: cssTop(306, 18, 1.2), w: 250, text_size: 18, font: F.medium, color: C.muted })

  return {
    render({ subject, agenda, is24 }) {
      const head = eventLabel(subject, { is24, timeFirst: true })
      when.set({ text: head.text, color: head.wrapUp ? C.alert : C.lime })
      title.setText(fitText(subject.title, 'bold', 34, 310))
      const n = moreSameDay(agenda, subject)
      const rest = n ? `+${n} more ${subject.daysAhead === 0 ? 'today' : 'that day'}` : 'Nothing else today'
      more.setText(subject.ongoing ? `Until ${formatTime(subject.endHours, subject.endMinutes, is24)} · ${rest}` : rest)
    },
    setVisible: (on) => showAll([when, title, more], on),
  }
}
