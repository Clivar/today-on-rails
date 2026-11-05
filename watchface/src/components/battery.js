// Battery icon and percentage, top right (right edge at x = 350).
import ui from '@zos/ui'
import { C, F } from '../ui/theme.js'
import { cssTop, showAll } from '../ui/widgets.js'
import { textWidth } from '../ui/text.js'

const RIGHT = 350

export function createBattery(screen) {
  const outline = screen.widget(ui.widget.STROKE_RECT, { x: 0, y: 47, w: 19, h: 11, radius: 3, line_width: 2, color: C.muted })
  const fill = screen.widget(ui.widget.FILL_RECT, { x: 0, y: 50, w: 12, h: 6, radius: 1, color: C.muted })
  const nub = screen.widget(ui.widget.FILL_RECT, { x: 0, y: 50, w: 2, h: 5, radius: 1, color: C.muted })
  const label = screen.text({ x: 300, y: cssTop(40, 17, 1.2) + 2, w: 50, text_size: 17, font: F.semibold, color: C.muted, align_h: ui.align.RIGHT })

  return {
    render({ battery }) {
      const s = battery + '%'
      const x = RIGHT - textWidth(s, 'semibold', 17) - 6 - 24
      outline.set({ x: x + 1, y: 47, w: 19, h: 11 })
      fill.set({ x: x + 3, y: 50, w: Math.max(1, Math.round((12.5 * battery) / 100)), h: 6 })
      nub.set({ x: x + 21, y: 50, w: 2, h: 5 })
      label.setText(s)
    },
    setVisible: (on) => showAll([outline, fill, nub, label], on),
  }
}
