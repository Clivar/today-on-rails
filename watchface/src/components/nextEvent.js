// The "next" layout's event block:
//   upcoming: "6:00 PM · IN 58 MIN" / title / "+2 more today"
//   ongoing:  "NOW · 25 MIN LEFT" / title / "Until 10:30 · +2 more today"
import { C, F } from '../ui/theme.js'
import { text, cssTop, setText, setProps, setAllVisible } from '../ui/widgets.js'
import { fitText } from '../ui/text.js'
import { formatTime, formatIn, formatLeft, moreSameDay, isWrappingUp } from '../data/agenda.js'

export function createNextEvent() {
  const when = text({ x: 40, y: cssTop(238, 16, 1.2), w: 330, text_size: 16, font: F.bold, color: C.lime, char_space: 2 })
  const title = text({ x: 40, y: cssTop(263, 34, 1.1), w: 320, text_size: 34, font: F.bold, color: C.text })
  const more = text({ x: 40, y: cssTop(306, 18, 1.2), w: 250, text_size: 18, font: F.medium, color: C.muted })

  return {
    render({ subject, agenda, is24 }) {
      const head = subject.ongoing
        ? `Now · ${formatLeft(subject.endInMin)}`
        : `${formatTime(subject.hours, subject.minutes, is24)} · ${formatIn(subject.inMin)}`
      setProps(when, { text: head.toUpperCase(), color: isWrappingUp(subject) ? C.alert : C.lime })
      setText(title, fitText(subject.title, 'bold', 34, 310))
      const n = moreSameDay(agenda, subject)
      const rest = n ? `+${n} more ${subject.daysAhead === 0 ? 'today' : 'that day'}` : 'Nothing else today'
      setText(more, subject.ongoing ? `Until ${formatTime(subject.endHours, subject.endMinutes, is24)} · ${rest}` : rest)
    },
    setVisible: (on) => setAllVisible([when, title, more], on),
  }
}
