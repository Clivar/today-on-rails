// The agenda travels inside the weather location name (format in README.md):
//   "Brussels · 31/10 · cfg next=360 focus=15 during=1 ready=60 rail=60 buzz=start+end · C09:00-10:30 Team call · R18:00 Water the plants · 1/11 · C@10:00-11:00 Dentist"
//   city · date · settings · items · date · items …
// - A date (day/month) sets the day of the items after it; the first part after the city must be one.
// - Items: R (reminder, a moment) or C (calendar event, optional end time), 24-hour times, then the title.
//   "C@" marks an event with a place (address/location): it can get a "get ready" Today card earlier.
//   Within a day, a time earlier than the previous one rolls over to the next day.
// - "cfg …" carries the settings chosen in the phone app (layouts, and which moments buzz).
// - "no weather" means the phone sent no real weather: the face hides it.

const SEP = ' · '
const ITEM = /^([RC])(@?)(\d{1,2}):(\d{2})(?:-(\d{1,2}):(\d{2}))? (.+)$/
const DATE = /^(\d{1,2})\/(\d{1,2})$/
const CFG = /^cfg( .*)?$/
const NO_WEATHER = 'no weather'

// Defaults when the phone sends no settings
export const DEFAULT_SETTINGS = {
  next: 360, // minutes before an event: show the "next" layout
  focus: 30, // minutes before an event: show the Today card (0 = off)
  during: true, // show the Today card while an event is ongoing
  ready: 0, // minutes before an event with a place: "get ready" Today card (0 = off)
  rail: 180, // minutes: the green rail (lime arc) shows only when its end is this close (battery)
  buzz: { start: false, end: false, ready: false }, // the watch buzzes at these moments
}
export const RAIL_HOURS = 12

// The watch still buzzes for a moment this many minutes after it (the screen came on just after it:
// data/buzzes.js). So a moment without length (a reminder) stays that long after it's past, in
// agenda.justPast: for the buzzer only, the screens never show it.
export const LATE_MIN = 1

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function dayNumber(y, m, d) {
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

// now as a count of minutes since 1 Jan 1970 (local time): one number per minute of the calendar
export function minuteOf(now) {
  return dayNumber(now.year, now.month, now.day) * 1440 + now.hours * 60 + now.minutes
}

function parseSettings(part) {
  const s = { ...DEFAULT_SETTINGS }
  for (const kv of part.split(' ').slice(1)) {
    const [k, v] = kv.split('=')
    const n = Number(v)
    if (k === 'next' && n >= 0) s.next = n
    if (k === 'focus' && n >= 0) s.focus = n
    if (k === 'during') s.during = v === '1'
    if (k === 'ready' && n >= 0) s.ready = n
    if (k === 'rail' && n > 0) s.rail = n
    if (k === 'buzz') {
      const on = (v || '').split('+')
      s.buzz = { start: on.includes('start'), end: on.includes('end'), ready: on.includes('ready') }
    }
  }
  return s
}

// now: { year, month (1-12), day, hours, minutes }
// Items keep minutes relative to now: inMin (start) and endInMin (end; same as start for reminders).
// items: what's on or still to come, by start; justPast: moments without length up to LATE_MIN ago.
export function parseAgenda(cityName, now) {
  const parts = (cityName || '').split(SEP)
  const result = {
    city: parts[0] || '', items: [], justPast: [], valid: false, weather: !parts.includes(NO_WEATHER),
    settings: { ...DEFAULT_SETTINGS },
  }
  if (parts.length < 2 || !DATE.test(parts[1])) return result

  const today = dayNumber(now.year, now.month, now.day)
  const nowMin = now.hours * 60 + now.minutes
  let year = now.year
  let lastMonth = 0
  let day = null // day number of the current date part
  let prev = -1 // minutes since `day` of the previous item's start

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    const d = part.match(DATE)
    if (d) {
      const dd = Number(d[1])
      const mm = Number(d[2])
      if (lastMonth === 0) {
        // The first date is today or a little earlier; around New Year it can be last year
        if (mm > now.month + 6) year -= 1
      } else if (mm < lastMonth) {
        year += 1
      }
      lastMonth = mm
      day = dayNumber(year, mm, dd)
      prev = -1
      continue
    }
    if (CFG.test(part)) {
      result.settings = parseSettings(part)
      continue
    }
    const m = part.match(ITEM)
    if (!m || day === null) continue

    const [, kind, at, sh, sm, eh, em, title] = m
    let start = Number(sh) * 60 + Number(sm)
    while (start < prev) start += 1440
    prev = start
    let end = start
    if (eh !== undefined) {
      end = Number(eh) * 60 + Number(em)
      while (end < start) end += 1440 // ends after midnight
    }
    const offset = (day - today) * 1440 - nowMin
    const inMin = start + offset
    const endInMin = end + offset
    const past = endInMin < 0
    if (past && (end > start || inMin < -LATE_MIN)) continue // over (a moment just past stays: LATE_MIN)

    const startDay = today + Math.floor((start + (day - today) * 1440) / 1440)
    const list = past ? result.justPast : result.items
    list.push({
      kind: kind === 'C' ? 'calendar' : 'reminder',
      hasPlace: at === '@',
      hours: Number(sh),
      minutes: Number(sm),
      endHours: eh !== undefined ? Number(eh) : null,
      endMinutes: eh !== undefined ? Number(em) : null,
      title: title.trim(),
      inMin,
      endInMin,
      ongoing: inMin <= 0 && endInMin > 0,
      daysAhead: startDay - today,
      weekDay: (startDay + 4) % 7, // day 0 (1 Jan 1970) was a Thursday
      date: new Date(startDay * 86400000),
    })
  }
  result.items.sort((a, b) => a.inMin - b.inMin)
  result.valid = true
  return result
}

// What the screen is about right now:
//   layout  'clear' | 'next' | 'focus' (the Today card)
//   subject the event the layout shows (ongoing or upcoming), or the next one for "Free until"
//   ready   true when it's the "get ready" Today card for an event with a place
export function chooseLayout(agenda) {
  const s = agenda.settings
  const current = agenda.items.find((it) => it.ongoing) || null
  const upcoming = agenda.items.find((it) => it.inMin > 0) || null

  if (current && s.during) return { layout: 'focus', subject: current }
  if (upcoming && s.focus > 0 && upcoming.inMin <= s.focus) return { layout: 'focus', subject: upcoming }
  if (upcoming && upcoming.hasPlace && s.ready > 0 && upcoming.inMin <= s.ready) {
    return { layout: 'focus', subject: upcoming, ready: true }
  }
  if (current) return { layout: 'next', subject: current }
  if (upcoming && upcoming.inMin <= s.next) return { layout: 'next', subject: upcoming }
  return { layout: 'clear', subject: upcoming }
}

// The last minutes of an event: time to wrap up (the label says so, in orange; the "end" buzz).
// Only events long enough to have a last 5 minutes: a 5-minute stand-up isn't "wrapping up" from the start.
export const WRAP_UP_MIN = 5
export const hasWrapUp = (item) => item.kind === 'calendar' && item.endInMin - item.inMin >= WRAP_UP_MIN * 2
export const isWrappingUp = (item) => !!item && item.ongoing && hasWrapUp(item) && item.endInMin <= WRAP_UP_MIN

// The small upper-case line above an event's title (Today card and "next" layout):
//   upcoming   "NEXT · IN 10 MIN", "GET READY · IN 58 MIN" (ready), "6:00 PM · IN 58 MIN" (timeFirst)
//   ongoing    "NOW · 25 MIN LEFT", last minutes "WRAP IT UP · 4 MIN LEFT"
//   fixedTimes "NEXT · 6:00 PM", "NOW · UNTIL 10:30", "WRAP IT UP · UNTIL 10:30" (the always-on card)
// wrapUp: show it in the alert color.
export function eventLabel(subject, { is24 = false, ready = false, fixedTimes = false, timeFirst = false } = {}) {
  const wrapUp = isWrappingUp(subject)
  let lead
  let rest
  if (subject.ongoing) {
    lead = wrapUp ? 'Wrap it up' : 'Now'
    rest = fixedTimes ? `until ${formatTime(subject.endHours, subject.endMinutes, is24)}` : formatLeft(subject.endInMin)
  } else {
    lead = timeFirst ? formatTime(subject.hours, subject.minutes, is24) : ready ? 'Get ready' : 'Next'
    rest = fixedTimes ? formatWhen(subject, is24) : formatIn(subject.inMin)
  }
  return { text: `${lead} · ${rest}`.toUpperCase(), wrapUp }
}

// Items after `subject` (for the Today card list)
export function itemsAfter(agenda, subject, count) {
  const i = agenda.items.indexOf(subject)
  return agenda.items.slice(i + 1, i + 1 + count)
}

// Items after `item` on the same day as `item`
export function moreSameDay(agenda, item) {
  return agenda.items.filter((it) => it !== item && it.inMin > item.inMin && it.daysAhead === item.daysAhead).length
}

// Position on the 12-hour rail, 0..12 (12 o'clock = 0)
export function railHour(hours, minutes) {
  return (hours % 12) + minutes / 60
}

// Is the item's start within the rail's 12 hours?
export const startsOnRail = (it) => it.inMin >= 0 && it.inMin < RAIL_HOURS * 60

// Where the layout's subject is marked on the rail: its end while it's on, otherwise its start.
// { h, hours, minutes } or null when it's beyond the rail's 12 hours.
export function railTarget(subject) {
  if (!subject) return null
  if (subject.ongoing) {
    if (subject.endInMin >= RAIL_HOURS * 60) return null
    return { h: railHour(subject.endHours, subject.endMinutes), hours: subject.endHours, minutes: subject.endMinutes }
  }
  if (!startsOnRail(subject)) return null
  return { h: railHour(subject.hours, subject.minutes), hours: subject.hours, minutes: subject.minutes }
}

export function formatTime(h, m, is24, withSuffix = true) {
  const mm = m < 10 ? '0' + m : '' + m
  if (is24) return (h < 10 ? '0' + h : '' + h) + ':' + mm
  const h12 = h % 12 === 0 ? 12 : h % 12
  return withSuffix ? `${h12}:${mm} ${h < 12 ? 'AM' : 'PM'}` : `${h12}:${mm}`
}

// "in 58 min", "in 2 h 5 min"
export function formatIn(min) {
  if (min < 1) return 'now'
  if (min < 60) return `in ${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `in ${h} h` : `in ${h} h ${m} min`
}

// "25 min left", "1 h 10 min left"
export function formatLeft(min) {
  if (min < 60) return `${min} min left`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h left` : `${h} h ${m} min left`
}

// "9:00 – 10:30 AM" (or just the start for reminders)
export function formatSpan(item, is24) {
  if (item.endHours === null) return formatTime(item.hours, item.minutes, is24)
  return `${formatTime(item.hours, item.minutes, is24, false)} – ${formatTime(item.endHours, item.endMinutes, is24)}`
}

// "today" / "tomorrow" / "Tuesday" / "12 Nov"
export function formatDay(item) {
  if (item.daysAhead === 0) return 'today'
  if (item.daysAhead === 1) return 'tomorrow'
  if (item.daysAhead < 7) return DAY_NAMES[item.weekDay]
  return `${item.date.getUTCDate()} ${MONTHS[item.date.getUTCMonth()]}`
}

// Line under the big clock: "Free until 18:00", "Free until tomorrow 09:00", "Free until Monday 10:00"
export function freeUntil(agenda, next, is24) {
  if (!agenda.valid) return 'No agenda from the phone'
  if (!next) return 'Nothing planned'
  const t = formatTime(next.hours, next.minutes, is24)
  if (next.daysAhead === 0) return `Free until ${t}`
  if (next.daysAhead < 7) return `Free until ${formatDay(next)} ${t}`
  return `Free until ${formatDay(next)}`
}

// Shorter variant when the full line doesn't fit
export function freeUntilShort(agenda, next) {
  if (!agenda.valid) return 'No agenda'
  if (!next) return 'Nothing planned'
  if (next.daysAhead === 0) return 'Free for now'
  return `Free until ${formatDay(next)}`
}

// "18:00" today, "Tomorrow 18:00", "Tue 10:00" on another day
export function formatWhen(item, is24, withSuffix = true) {
  const t = formatTime(item.hours, item.minutes, is24, withSuffix)
  if (item.daysAhead === 0) return t
  if (item.daysAhead === 1) return `Tomorrow ${t}`
  return `${DAYS[item.weekDay]} ${t}`
}

// weekDay: 0 = Sunday
export function formatDate(weekDay, day, month) {
  return `${DAYS[weekDay]} ${day} ${MONTHS[month - 1]}`
}
