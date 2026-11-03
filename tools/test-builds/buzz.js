// buzz: the start buzz once a minute for an hour after installing, lit and dimmed.
// (Dimmed means always-on: wear the watch.) Every minute has a reminder; the agenda holds this
// minute's and the next one (the screen shows "in 1 min"; a whole hour of them would put 60 dots on
// the rail). After the hour it's quiet, so a forgotten test build doesn't buzz all day.
import { writeAgenda } from './shared/agendaText.js'

export const MINUTES = 60

export function agendaText(now, firstRun) {
  const items = []
  for (let at = now; at <= now + 1 && at < firstRun + MINUTES; at++) {
    items.push({ at, title: `Buzz ${at - firstRun + 1} of ${MINUTES}` })
  }
  return writeAgenda(now, 'next=360 focus=0 during=1 ready=0 rail=180 buzz=start', items)
}
