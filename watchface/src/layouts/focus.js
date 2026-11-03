// "Focus" — the Today card: one event, large, with what comes after it.
// Shown while an event is on and/or just before one (configurable on the phone).
// Helps to stay on track; no date, battery or complications to distract (it never makes them).
// Made the first time it's shown (watchface/index.js); new widgets show by themselves, so
// setVisible is only for switching between layouts.
import { C } from '../ui/theme.js'
import { AVOID } from '../components/rail.js'
import { createSmallClock } from '../components/smallClock.js'
import { createTodayCard } from '../components/todayCard.js'
import { createUpNext } from '../components/upNext.js'

export function createFocusLayout(frame) {
  const clock = createSmallClock(C.muted)
  const card = createTodayCard({ label: C.lime, title: C.text, time: C.text })
  const upNext = createUpNext()
  const parts = [clock, card, upNext]

  return {
    render(state) {
      clock.render(state)
      card.render(state)
      upNext.render(state)
      frame.rail.render(state, { emphasis: true, avoid: AVOID.card })
    },
    setVisible(on) {
      parts.forEach((part) => part.setVisible(on))
    },
  }
}
