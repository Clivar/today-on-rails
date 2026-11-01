// "Next": an event starts soon (configurable on the phone), or one is on.
// Smaller clock, the event ("6:00 PM · IN 58 MIN" / "NOW · 25 MIN LEFT", title, what else today),
// and a lime arc on the rail from now to the event.
import { CLOCK } from '../ui/clockSizes.js'
import { AVOID } from '../components/rail.js'
import { createNextEvent } from '../components/nextEvent.js'

export function createNextLayout(frame) {
  const nextEvent = createNextEvent()

  return {
    show(state) {
      frame.date.setVisible(true)
      frame.date.render(state)
      frame.battery.setVisible(true)
      frame.battery.render(state)
      frame.clock.setVisible(true)
      frame.clock.render(state, CLOCK.next)
      nextEvent.setVisible(true)
      nextEvent.render(state)
      frame.complications.render(state, { compact: true })
      frame.rail.render(state, { emphasis: true, avoid: AVOID.clock })
    },
    hide() {
      nextEvent.setVisible(false)
    },
  }
}
