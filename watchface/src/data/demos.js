// Fixed data for screenshots: tools/build.sh <demo>. 12-hour like the design boards.
const AGENDA =
  'Brussels · 23/10 · cfg next=360 focus=15 during=1 · C09:00-10:30 Team call · R18:00 Water the plants · ' +
  'R19:30 Walk the dog · C20:00-21:00 Call Sam · 26/10 · C10:00-11:00 Dentist'
const FRIDAY = { year: 2026, month: 10, day: 23, weekDay: 5 }
const BASE = { cityName: AGENDA, battery: 82, heart: 72, steps: 6214, is24: false }
const at = (hours, minutes, extra = {}) => ({ ...BASE, now: { ...FRIDAY, hours, minutes }, ...extra })

// A reminder every 3 minutes for the next hour, with "buzz at start" on
function buzzTestAgenda(now) {
  const pad = (n) => (n < 10 ? '0' : '') + n
  const first = Math.ceil((now.hours * 60 + now.minutes + 1) / 3) * 3
  const items = []
  for (let t = first; t < first + 60 && t < 1440; t += 3) items.push(`R${pad(Math.floor(t / 60))}:${pad(t % 60)} Buzz test`)
  return `Test · ${now.day}/${now.month} · cfg buzz=start · ${items.join(' · ')}`
}

export const DEMOS = {
  // clear: nothing within 6 h
  clear: at(10, 47),
  // clear, next event days ahead: "Free until Monday 10:00 AM"
  'clear-days': at(21, 30),
  // clear without weather (the phone couldn't fetch it)
  'no-weather': at(10, 47, { cityName: AGENDA + ' · no weather' }),
  // next: an event within 6 h
  next: at(17, 2),
  // the Today card, 10 min before an event (focus=15)
  focus: at(17, 50),
  // the Today card during an event
  'focus-ongoing': at(9, 35),
  // the last minutes of an event: the label turns orange
  'focus-wrap-up': at(10, 26),
  // always-on versions, shown on the normal screen
  'always-on-clear': at(10, 47, { alwaysOn: true }),
  'always-on-next': at(17, 2, { alwaysOn: true }),
  'always-on-focus': at(9, 35, { alwaysOn: true }),
  // the real face plus a diagnostic panel on the dim screen (lime square, orange circle, mic, a text line)
  'aod-check': { aodCheck: true },
  // buzz test on the real clock: the watch buzzes every 3 minutes (:00, :03, :06, …)
  'buzz-test': { buzz: true, cityName: buzzTestAgenda },
  // real time, no agenda, normal and always-on clocks on top of each other
  align: { align: true, alwaysOn: true, cityName: '' },
  // same, in the "next" layout: an event far ahead with a window that always includes it
  'align-next': { align: true, alwaysOn: true, cityName: 'X · 31/12 · cfg next=600000 focus=0 during=0 · R23:59 Align' },
}
