// perf: how long building and refreshing the face takes on the watch, with the numbers on screen.
// A busy day that follows the clock, so every build does the same work: the Today card for an event
// that is always on (since half an hour before this hour, until an hour and a half after it), with
// reminders in its list, more events and reminders as dots on the rail, the lime arc to the event's
// end. The agenda only changes on the full hour, like a phone's text that stays put.
// The measuring is added to the build copy by tools/test-builds/perf/instrument.mjs (tools/build.sh),
// and tests/watch/buildCost.test.mjs runs the same agenda in Node with counted @zos calls.
import { writeAgenda, DAY, HOUR } from './shared/agendaText.js'

export function agendaText(now) {
  const base = now - (now % HOUR) // this hour
  const last = base + 330
  let review = base - (base % DAY) + DAY + 10 * HOUR // tomorrow 10:00
  if (review <= last) review += DAY
  return writeAgenda(now, 'next=360 focus=0 during=1 ready=60 rail=180 buzz=none', [
    { at: base - 30, end: base + 90, title: 'Team call' },
    { at: base + 75, title: 'Water the plants' },
    { at: base + 100, title: 'Walk the dog' },
    { at: base + 150, end: base + 195, title: 'Dentist', place: true },
    { at: base + 240, end: base + 270, title: 'Call Sam' },
    { at: last, title: 'Stretch' },
    { at: review, end: review + HOUR, title: 'Weekly review' },
  ])
}
