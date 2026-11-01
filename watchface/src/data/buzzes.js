// Which buzz (if any) is due right now. The watch buzzes itself — no phone, no notifications —
// whenever the watchface runs: screen lit or dimmed (always-on, while worn). With the screen fully
// off the face is paused, so a moment can be missed; a buzz still comes up to a minute late.
import { WRAP_UP_MIN } from './agenda.js'

const LATE_MIN = 1 // still buzz this many minutes after the moment (screen came on just after)

// → { key, kind } or null. key identifies the moment, so it buzzes once.
export function dueBuzz(agenda) {
  const { buzz, ready } = agenda.settings
  const due = (minutesUntil) => minutesUntil <= 0 && minutesUntil >= -LATE_MIN
  for (const it of agenda.items) {
    const id = `${it.daysAhead}/${it.hours}:${it.minutes} ${it.title}`
    if (buzz.ready && ready > 0 && it.hasPlace && due(it.inMin - ready)) return { key: 'ready ' + id, kind: 'ready' }
    if (buzz.start && due(it.inMin)) return { key: 'start ' + id, kind: 'start' }
    // The wrap-up buzz only for events long enough to have a "last 5 minutes"
    const long = it.endInMin - it.inMin >= WRAP_UP_MIN * 2
    if (buzz.end && it.kind === 'calendar' && long && due(it.endInMin - WRAP_UP_MIN)) return { key: 'end ' + id, kind: 'end' }
  }
  return null
}
