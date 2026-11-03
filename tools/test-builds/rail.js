// rail: long arcs and dots all round, to check the rail's edges on the device, whatever the time.
// Follows the clock (no first run):
// - an event on since an hour ago that ends 5 hours from now (the "next" layout, during=0): its dim
//   and lime arcs span 6 of the 12 hours, so they cross at least one screen corner;
// - a reminder on each full hour from this one to 12 hours on: a dot on every hour position, so at 12,
//   6 and in the four corners (the full hours 1, 5, 7 and 11 lie in them), where the screen edge must
//   not clip any. This hour's reminder is past (off the rail) once the hour has begun; the one 12 hours
//   on then takes its place, so there are always 12 dots.
import { writeAgenda, HOUR } from './shared/agendaText.js'

export function agendaText(now) {
  const hour = now - (now % HOUR)
  const items = [{ at: now - HOUR, end: now + 5 * HOUR, title: 'Workshop' }]
  for (let h = 0; h <= 12; h++) items.push({ at: hour + h * HOUR, title: 'Stretch' })
  return writeAgenda(now, 'next=720 focus=0 during=0 ready=0 rail=720 buzz=none', items)
}
