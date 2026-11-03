// Always-on version of the Today card: the small time and the event block where they are on
// the normal card, dimmed; no list and no date (it never makes the date). Fixed times instead of
// countdowns ("NOW · UNTIL 10:30"), because the screen is frozen while dimmed.
// Made the first time it's shown, like the screen-on layouts.
import { C } from '../ui/theme.js'
import { AVOID } from '../components/rail.js'
import { createTodayCard } from '../components/todayCard.js'

export function createAlwaysOnFocusLayout(frame) {
  const clock = frame.clock()
  const card = createTodayCard({ label: C.aodLime, title: C.aodText, time: C.aodMuted }, { fixedTimes: true })

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
