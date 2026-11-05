// "Fri 23 Oct", top left.
import { F } from '../ui/theme.js'
import { cssTop } from '../ui/widgets.js'
import { formatDate } from '../data/agenda.js'

export function createDate(screen, color) {
  const label = screen.text({ x: 40, y: cssTop(40, 20, 1.2), w: 250, text_size: 20, font: F.semibold, color })
  return {
    render({ now }) {
      label.setText(formatDate(now.weekDay, now.day, now.month))
    },
    setVisible: (on) => label.show(on),
  }
}
