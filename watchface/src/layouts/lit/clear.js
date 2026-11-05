// "Clear": nothing coming up soon.
// Big clock, "Free until …" (today, tomorrow, a weekday or a date), and the full bottom row.
// Made the first time it's shown (layouts/lit/index.js); new widgets show by themselves, so
// setVisible is only for switching between layouts.
import { CLOCK } from '../../ui/clockSizes.js'
import { AVOID } from '../../components/rail.js'
import { createFreeUntil } from '../../components/freeUntil.js'

export function createClearLayout(screen, frame) {
  // Frame parts in the frame's order (layouts/lit/frame.js), then this layout's own
  const date = frame.date()
  const battery = frame.battery()
  const clock = frame.clock()
  const complications = frame.complications()
  const freeUntil = createFreeUntil(screen)
  const parts = [date, battery, clock, freeUntil]

  return {
    render(state) {
      date.render(state)
      battery.render(state)
      clock.render(state, CLOCK.clear)
      freeUntil.render(state)
      complications.render(state, { compact: false })
      frame.rail.render(state, { emphasis: false, avoid: AVOID.clock })
    },
    // The bottom row shows what fits when it's drawn
    setVisible(on) {
      parts.forEach((part) => part.setVisible(on))
      if (!on) complications.hide()
    },
  }
}
