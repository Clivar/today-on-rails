// The Today card's main block: one event, large.
//   upcoming: "NEXT · IN 10 MIN" / "Water the / plants" / "6:00 PM"
//   ongoing:  "NOW · 25 MIN LEFT" / "Team call" / "9:00 – 10:30 AM"
//   get ready: "GET READY · IN 58 MIN" (an event with a place, earlier than the usual card)
//   last 5 minutes: the label turns orange, so the switch to what's next doesn't surprise
import { C, F } from '../ui/theme.js'
import { text, cssTop, setProps, setAllVisible } from '../ui/widgets.js'
import { wrapText } from '../ui/text.js'
import { formatIn, formatLeft, formatSpan, formatTime, formatWhen, isWrappingUp } from '../data/agenda.js'

const TOP = 116
const TITLE_SIZE = 56
const TITLE_LINE = TITLE_SIZE * 0.95

// colors: { label, title, time }
// fixedTimes: "NOW · UNTIL 10:30" / "NEXT · 6:00 PM" instead of countdowns (for the always-on card)
export function createTodayCard(colors, { fixedTimes = false } = {}) {
  const label = text({ x: 40, y: cssTop(TOP, 17, 1.2), w: 330, text_size: 17, font: F.bold, color: colors.label, char_space: 2 })
  const title = [0, 1].map(() => text({ x: 40, y: 0, w: 330, text_size: TITLE_SIZE, font: F.bold, color: colors.title }))
  const time = text({ x: 40, y: 0, w: 320, text_size: 30, font: F.medium, color: colors.time })

  function render({ subject, is24, ready }) {
    let what = subject.ongoing ? `Now · ${formatLeft(subject.endInMin)}` : `${ready ? 'Get ready' : 'Next'} · ${formatIn(subject.inMin)}`
    if (fixedTimes) {
      what = subject.ongoing
        ? `Now · until ${formatTime(subject.endHours, subject.endMinutes, is24)}`
        : `${ready ? 'Get ready' : 'Next'} · ${formatWhen(subject, is24)}`
    }
    setProps(label, { text: what.toUpperCase(), color: !fixedTimes && isWrappingUp(subject) ? C.alert : colors.label })

    let y = TOP + 17 * 1.2 + 8
    const lines = wrapText(subject.title, 'bold', TITLE_SIZE, 310, 2)
    title.forEach((w, i) => {
      setAllVisible([w], i < lines.length)
      if (i < lines.length) {
        setProps(w, { y: cssTop(y, TITLE_SIZE, 0.95), text: lines[i] })
        y += TITLE_LINE
      }
    })
    setProps(time, { y: cssTop(y + 8, 30, 1.2), text: formatSpan(subject, is24) })
  }

  return { render, setVisible: (on) => setAllVisible([label, ...title, time], on) }
}
