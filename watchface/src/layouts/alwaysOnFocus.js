// Always-on version of the Today card: the small time and the event block where they are on
// the normal card, dimmed; no list. Fixed times instead of countdowns ("NOW · UNTIL 10:30"),
// because the screen is frozen while dimmed.
import { C } from '../ui/theme.js'
import { AVOID } from '../components/rail.js'
import { createTodayCard } from '../components/todayCard.js'

export function createAlwaysOnFocusLayout(frame) {
  const card = createTodayCard({ label: C.aodLime, title: C.aodText, time: C.aodMuted }, { fixedTimes: true })

  return {
    show(state) {
      frame.date.setVisible(false)
      frame.clock.render(state, 'small')
      card.setVisible(true)
      card.render(state)
      frame.rail.render(state, { avoid: AVOID.card })
    },
    hide() {
      card.setVisible(false)
    },
  }
}
