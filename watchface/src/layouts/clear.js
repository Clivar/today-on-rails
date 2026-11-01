// "Clear": nothing coming up soon.
// Big clock, "Free until …" (today, tomorrow, a weekday or a date), and the full bottom row.
import { CLOCK } from '../ui/clockSizes.js'
import { AVOID } from '../components/rail.js'
import { createFreeUntil } from '../components/freeUntil.js'

export function createClearLayout(frame) {
  const freeUntil = createFreeUntil()

  return {
    show(state) {
      frame.date.setVisible(true)
      frame.date.render(state)
      frame.battery.setVisible(true)
      frame.battery.render(state)
      frame.clock.setVisible(true)
      frame.clock.render(state, CLOCK.clear)
      freeUntil.setVisible(true)
      freeUntil.render(state)
      frame.complications.render(state, { compact: false })
      frame.rail.render(state, { emphasis: false, avoid: AVOID.clock })
    },
    hide() {
      freeUntil.setVisible(false)
    },
  }
}
