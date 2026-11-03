// Always-on version of "clear": the outlined big clock where the normal one is, the date,
// and "Free until …" dimmed. (Nothing here counts down: the screen is frozen while dimmed.)
// Made the first time it's shown, like the screen-on layouts.
import { C } from '../ui/theme.js'
import { AVOID } from '../components/rail.js'
import { createFreeUntil } from '../components/freeUntil.js'

export function createAlwaysOnClearLayout(frame) {
  const date = frame.date()
  const clock = frame.clock()
  const freeUntil = createFreeUntil(C.aodText)

  return {
    render(state) {
      date.render(state)
      clock.render(state, 'clear') // shows this layout's clock, hides the others
      freeUntil.render(state)
      frame.rail.render(state, { avoid: AVOID.clock })
    },
    setVisible(on) {
      date.setVisible(on)
      freeUntil.setVisible(on)
    },
  }
}
