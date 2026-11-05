// "Next": an event starts soon (configurable on the phone), or one is on.
// Smaller clock, the event ("6:00 PM · IN 58 MIN" / "NOW · 25 MIN LEFT", title, what else today),
// and a lime arc on the rail from now to the event.
// Made the first time it's shown (layouts/lit/index.js); new widgets show by themselves, so
// setVisible is only for switching between layouts.
import { CLOCK } from '../../ui/clockSizes.js'
import { AVOID } from '../../components/rail.js'
import { createNextEvent } from '../../components/nextEvent.js'

export function createNextLayout(screen, frame) {
  // Frame parts in the frame's order (layouts/lit/frame.js), then this layout's own
  const date = frame.date()
  const battery = frame.battery()
  const clock = frame.clock()
  const complications = frame.complications()
  const nextEvent = createNextEvent(screen)
  const parts = [date, battery, clock, nextEvent]

  return {
    render(state) {
      date.render(state)
      battery.render(state)
      clock.render(state, CLOCK.next)
      nextEvent.render(state)
      complications.render(state, { compact: true })
      frame.rail.render(state, { emphasis: true, avoid: AVOID.clock })
    },
    // The bottom row shows what fits when it's drawn
    setVisible(on) {
      parts.forEach((part) => part.setVisible(on))
      if (!on) complications.hide()
    },
  }
}
