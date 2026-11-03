// wrap-up: "WRAP IT UP" and the end buzz 3 minutes after installing, then the next event.
// An event that's on and ends 8 minutes after the first run (the label and the buzz come 5 minutes
// before the end).
import { writeAgenda } from './shared/agendaText.js'

export function agendaText(now, firstRun) {
  return writeAgenda(now, 'next=360 focus=0 during=1 ready=0 rail=180 buzz=end', [
    { at: firstRun - 30, end: firstRun + 8, title: 'Team call' },
    { at: firstRun + 30, end: firstRun + 60, title: 'Call Sam' },
  ])
}
