// The dim screen's "next": the outlined clock where the normal one is, the date,
// and one line "● 6:00 PM · Water the plants" (or "Until 10:30 · Team call" while it's on).
// Made the first time it's shown, like the lit layouts.
import { AVOID } from '../../components/rail.js'
import { createDimLine } from '../../components/dimLine.js'

export function createDimNextLayout(screen, frame) {
  const date = frame.date()
  const clock = frame.clock()
  const line = createDimLine(screen)

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
