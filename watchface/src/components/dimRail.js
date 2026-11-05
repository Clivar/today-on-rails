// The dim screen's rail: the numerals and the event's dot and time, made of plain widgets (a canvas
// flagged for the dim screen can't draw). No "now" dot or arc: the dim screen should stay still.
// The dot sits exactly where the lit rail's subject dot is, so nothing jumps when the watch dims.
// The dot and the label are created by the first render that needs them (none without an event),
// with their first props. Neither overlaps anything else, so being created last changes nothing.
import ui from '@zos/ui'

import { C } from '../ui/theme.js'
import { textWidth } from '../ui/text.js'
import { railPoint, discBox, labelSpot, hoursApart, NUMERALS, OUTER, MARK } from '../ui/railGeometry.js'
import { railTarget, formatTime } from '../data/agenda.js'
import { pool } from '../ui/lazy.js'
import { numeral, piece, timeLabel, labelProps } from './rail.js'

const DOT = MARK.dim.d
const NONE = []

export function createDimRail(screen) {
  const numerals = NUMERALS.map((n) => numeral(screen, n[0], n[1], C.dimNumeral))
  // A round FILL_RECT: unlike CIRCLE, it can be moved after it's created
  const eventDot = pool((box) => piece(screen, ui.widget.FILL_RECT, box, C.dimLime))
  const label = pool(timeLabel(screen))

  function render(state, options) {
    const target = railTarget(state.subject)
    const labelText = target ? formatTime(target.hours, target.minutes, state.is24, false) : ''
    const spot = target && labelSpot(target.h, textWidth(labelText, 'bold', 16) + 8, options.avoid)

    const p = target && railPoint(target.h, OUTER)
    eventDot(target ? [discBox(p[0], p[1], DOT)] : NONE, false)
    for (let i = 0; i < NUMERALS.length; i++) numerals[i].show(!spot || hoursApart(NUMERALS[i][0], target.h) >= 0.75)
    label(spot ? [labelProps(spot, labelText, C.dimLime)] : NONE, false)
  }

  return { render }
}
