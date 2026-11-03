// Writes an agenda text in the phone's format (watchface/src/data/agenda.js) for the test builds.
// Times are absolute minutes: minutes since 1970 in local time, like minuteOf() on the watch.
export const DAY = 1440
export const HOUR = 60

const pad = (n) => (n < 10 ? '0' : '') + n
const clock = (min) => `${pad(Math.floor((min % DAY) / HOUR))}:${pad(min % HOUR)}`
const date = (day) => {
  const d = new Date(day * DAY * 60000)
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`
}

// now: absolute minute; cfg: every setting spelled out ('next=360 focus=0 during=1 ready=0 rail=180 buzz=…'),
// so a change of the watch's fallback defaults never changes what a test build shows; items: { at, end, title, place }
// (no end: a reminder). The first date is today, or the day of an event that is on since before.
export function writeAgenda(now, cfg, items) {
  const parts = ['Test']
  let day = null
  const onDay = (d) => {
    if (d !== day) parts.push(date(d))
    day = d
  }
  const sorted = [...items].sort((a, b) => a.at - b.at)
  onDay(Math.min(Math.floor(now / DAY), sorted.length ? Math.floor(sorted[0].at / DAY) : Infinity))
  parts.push(`cfg ${cfg}`)
  for (const it of sorted) {
    onDay(Math.floor(it.at / DAY))
    if (it.end === undefined) parts.push(`R${clock(it.at)} ${it.title}`)
    else parts.push(`C${it.place ? '@' : ''}${clock(it.at)}-${clock(it.end)} ${it.title}`)
  }
  return parts.join(' · ')
}
