// "Focus" — the Today card: one event, large, with what comes after it.
// Shown while an event is on and/or just before one (configurable on the phone).
// Helps to stay on track; no date, battery or complications to distract.
import { C } from '../ui/theme.js'
import { AVOID } from '../components/rail.js'
import { createSmallClock } from '../components/smallClock.js'
import { createTodayCard } from '../components/todayCard.js'
import { createUpNext } from '../components/upNext.js'

export function createFocusLayout(frame) {
  const clock = createSmallClock(C.muted)
  const card = createTodayCard({ label: C.lime, title: C.text, time: C.text })
  const upNext = createUpNext()
  const own = [clock, card, upNext]

  return {
    show(state) {
      frame.date.setVisible(false)
      frame.battery.setVisible(false)
      frame.clock.setVisible(false)
      frame.complications.hide()
      own.forEach((part) => part.setVisible(true))
      clock.render(state)
      card.render(state)
      upNext.render(state)
      frame.rail.render(state, { emphasis: true, avoid: AVOID.card })
    },
    hide() {
      own.forEach((part) => part.setVisible(false))
    },
  }
}
