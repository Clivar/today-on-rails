// Always-on version of "clear": the outlined big clock where the normal one is, the date,
// and "Free until …" dimmed. (Nothing here counts down: the screen is frozen while dimmed.)
import { C } from '../ui/theme.js'
import { AVOID } from '../components/rail.js'
import { createFreeUntil } from '../components/freeUntil.js'

export function createAlwaysOnClearLayout(frame) {
  const freeUntil = createFreeUntil(C.aodText)

  return {
    show(state) {
      frame.date.setVisible(true)
      frame.date.render(state)
      frame.clock.render(state, 'clear')
      freeUntil.setVisible(true)
      freeUntil.render(state)
      frame.rail.render(state, { avoid: AVOID.clock })
    },
    hide() {
      freeUntil.setVisible(false)
    },
  }
}
