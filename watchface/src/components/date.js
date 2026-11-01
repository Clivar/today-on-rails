// "Fri 23 Oct", top left.
import { F } from '../ui/theme.js'
import { text, cssTop, setText, setVisible } from '../ui/widgets.js'
import { formatDate } from '../data/agenda.js'

export function createDate(color) {
  const label = text({ x: 40, y: cssTop(40, 20, 1.2), w: 250, text_size: 20, font: F.semibold, color })
  return {
    render({ now }) {
      setText(label, formatDate(now.weekDay, now.day, now.month))
    },
    setVisible: (on) => setVisible(label, on),
  }
}
