// The always-on rail: the numerals and the event's dot and time, made of plain widgets (a canvas
// flagged for always-on can't draw). No "now" dot or arc: the dim screen should stay still.
// The dot sits exactly where the lit rail's subject dot is, so nothing jumps when the watch dims.
import ui from '@zos/ui'

import { C, F } from '../ui/theme.js'
import { widget, text } from '../ui/widgets.js'
import { textWidth } from '../ui/text.js'
import { railPoint, discBox, labelSpot, hoursApart, NUMERALS, OUTER, MARK } from '../ui/railGeometry.js'
import { railTarget, formatTime } from '../data/agenda.js'
import { numeral, tracked } from './rail.js'

const DOT = MARK.alwaysOn.d

export function createAlwaysOnRail() {
  const numerals = NUMERALS.map(([h, s]) => tracked(numeral(h, s, C.aodNumeral)))
  // A round FILL_RECT: unlike CIRCLE, it can be moved after it's created
  const eventDot = tracked(widget(ui.widget.FILL_RECT, { ...discBox(0, 0, DOT), color: C.aodLime }))
  const label = tracked(text({
    x: 0, y: 0, w: 80, h: 20, text_size: 16, font: F.bold, color: C.aodLime,
    align_h: ui.align.CENTER_H, align_v: ui.align.CENTER_V,
  }))

  function render(state, { avoid }) {
    const target = railTarget(state.subject)
    const labelText = target ? formatTime(target.hours, target.minutes, state.is24, false) : ''
    const spot = target && labelSpot(target.h, textWidth(labelText, 'bold', 16) + 8, avoid)

    if (target) {
      const [x, y] = railPoint(target.h, OUTER)
      eventDot.place(discBox(x, y, DOT))
    } else {
      eventDot.show(false)
    }
    NUMERALS.forEach(([h], i) => numerals[i].show(!spot || hoursApart(h, target.h) >= 0.75))
    label.show(!!spot)
    if (spot) label.set({ x: Math.round(spot.x - 40), y: Math.round(spot.y - 10), w: 80, h: 20, text: labelText })
  }

  return { render }
}
