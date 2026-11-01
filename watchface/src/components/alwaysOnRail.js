// The always-on rail: the numerals and the event's dot and time, made of plain widgets (a canvas
// flagged for always-on can't draw). No "now" dot or arc: the dim screen doesn't update, they'd
// stop moving.
import ui from '@zos/ui'

import { C, F } from '../ui/theme.js'
import { widget, text, setProps, setVisible, setAllVisible } from '../ui/widgets.js'
import { textWidth } from '../ui/text.js'
import { railPoint, labelSpot, hoursApart, NUMERALS, OUTER } from '../ui/railGeometry.js'
import { railTarget, formatTime } from '../data/agenda.js'
import { numeral } from './rail.js'

export function createAlwaysOnRail() {
  const numerals = NUMERALS.map(([h, s]) => numeral(h, s, C.aodNumeral))
  // A round FILL_RECT: unlike CIRCLE, it can be moved after it's created
  const eventDot = widget(ui.widget.FILL_RECT, { x: 0, y: 0, w: 12, h: 12, radius: 6, color: C.aodLime })
  const label = text({
    x: 0, y: 0, w: 80, h: 20, text_size: 16, font: F.bold, color: C.aodLime,
    align_h: ui.align.CENTER_H, align_v: ui.align.CENTER_V,
  })

  function render(state, { avoid }) {
    const target = railTarget(state.subject)
    const labelText = target ? formatTime(target.hours, target.minutes, state.is24, false) : ''
    const spot = target && labelSpot(target.h, textWidth(labelText, 'bold', 16) + 8, avoid)

    setVisible(eventDot, !!target)
    if (target) {
      const [x, y] = railPoint(target.h, OUTER)
      setProps(eventDot, { x: Math.round(x - 6), y: Math.round(y - 6), w: 12, h: 12 })
    }
    NUMERALS.forEach(([h], i) => setVisible(numerals[i], !spot || hoursApart(h, target.h) >= 0.75))
    setVisible(label, !!spot)
    if (spot) setProps(label, { x: Math.round(spot.x - 40), y: Math.round(spot.y - 10), w: 80, h: 20, text: labelText })
  }

  return { render, setVisible: (on) => setAllVisible([...numerals, eventDot, label], on) }
}
