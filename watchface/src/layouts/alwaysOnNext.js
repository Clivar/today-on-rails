// Always-on version of "next": the outlined clock where the normal one is, the date,
// and one line "● 6:00 PM · Water the plants" (or "Until 10:30 · Team call" while it's on).
// Made the first time it's shown, like the screen-on layouts.
import { AVOID } from '../components/rail.js'
import { createAlwaysOnLine } from '../components/alwaysOnLine.js'

export function createAlwaysOnNextLayout(frame) {
  const date = frame.date()
  const clock = frame.clock()
  const line = createAlwaysOnLine()

  return {
    render(state) {
      date.render(state)
      clock.render(state, 'next') // shows this layout's clock, hides the others
      line.render(state)
      frame.rail.render(state, { avoid: AVOID.clock })
    },
    setVisible(on) {
      date.setVisible(on)
      line.setVisible(on)
    },
  }
}
