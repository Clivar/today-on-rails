// Always-on version of "next": the outlined clock where the normal one is, the date,
// and one line "● 6:00 PM · Water the plants" (or "Until 10:30 · Team call" while it's on).
import { AVOID } from '../components/rail.js'
import { createAlwaysOnLine } from '../components/alwaysOnLine.js'

export function createAlwaysOnNextLayout(frame) {
  const line = createAlwaysOnLine()

  return {
    show(state) {
      frame.date.setVisible(true)
      frame.date.render(state)
      frame.clock.render(state, 'next')
      line.setVisible(true)
      line.render(state)
      frame.rail.render(state, { avoid: AVOID.clock })
    },
    hide() {
      line.setVisible(false)
    },
  }
}
