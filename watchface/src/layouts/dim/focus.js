// The dim screen's Today card: the small time and the event block where they are on
// the normal card, dimmed; no list and no date (it never makes the date). Fixed times instead of
// countdowns ("NOW · UNTIL 10:30"), because the screen is frozen while dimmed.
// Made the first time it's shown, like the lit layouts.
import { C } from '../../ui/theme.js'
import { AVOID } from '../../components/rail.js'
import { createTodayCard } from '../../components/todayCard.js'

export function createDimFocusLayout(screen, frame) {
  const clock = frame.clock()
  const card = createTodayCard(screen, { label: C.dimLime, title: C.dimText, time: C.dimMuted })

  return {
    render(state) {
      clock.render(state, 'small') // shows this layout's clock, hides the others
      card.render(state)
      frame.rail.render(state, { avoid: AVOID.card })
    },
    setVisible(on) {
      card.setVisible(on)
    },
  }
}
