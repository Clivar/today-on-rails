// demo: a sample day for screenshots, through every layout in about 5 hours from installing.
// Laid out from the first run (t0: that minute, rounded down to 5):
//   t0-15 → t0+75   Team call, already on: the Today card with its times, "wrap it up" from t0+70
//   t0+45           Water the plants, a reminder during the call (in the Today card's list)
//   t0+95           Walk the dog, a reminder: the "next" layout
//   t0+150 → +195   Dentist, at a place: the "get ready" Today card from t0+95 (ready=60), then on
//   t0+270 → +300   Call Sam: "next" again
//   another day     Weekly review at 10:00, at least 12 hours after that: the clock, "Free until …"
// Quiet (no buzz settings): it's for screenshots.
import { writeAgenda, DAY, HOUR } from './shared/agendaText.js'

export function agendaText(now, firstRun) {
  const t0 = firstRun - (firstRun % 5)
  const lastEnd = t0 + 300
  let review = t0 - (t0 % DAY) + DAY + 10 * HOUR // tomorrow 10:00
  if (review < lastEnd + 12 * HOUR) review += DAY
  return writeAgenda(now, 'next=360 focus=0 during=1 ready=60 rail=180 buzz=none', [
    { at: t0 - 15, end: t0 + 75, title: 'Team call' },
    { at: t0 + 45, title: 'Water the plants' },
    { at: t0 + 95, title: 'Walk the dog' },
    { at: t0 + 150, end: t0 + 195, title: 'Dentist', place: true },
    { at: t0 + 270, end: lastEnd, title: 'Call Sam' },
    { at: review, end: review + HOUR, title: 'Weekly review' },
  ])
}
