// When the watch buzzes. It buzzes by itself (no phone, no notifications) whenever the watchface runs:
// screen lit or dimmed (always-on, while worn). With the screen off the face is paused, so a moment
// can be missed; it still buzzes when the screen comes on up to LATE_MIN minutes after it (a reminder
// just past is kept for that in agenda.justPast, data/agenda.js).
//
// One idea: every moment has an absolute minute (minutes since 1970, local time); the watch remembers
// the minute of its last buzz and only buzzes for a due moment later than that. The face is rebuilt on
// every lit/dim switch, so that minute lives in storage (components/buzzer.js), not in memory.
// Pure: no @zos imports, so it's tested in node (tests/watch/buzzes.test.mjs).
import { WRAP_UP_MIN, LATE_MIN, hasWrapUp } from './agenda.js'

// When several moments fall in the same minute it's one buzz, named after the most pressing one:
// something starts now > wrap up now > leave within the hour.
const ORDER = ['start', 'end', 'ready']

// The moments the phone asked to buzz at, as { inMin, kind } relative to now
export function buzzMoments(agenda) {
  const { buzz, ready } = agenda.settings
  const moments = []
  for (const it of agenda.justPast.concat(agenda.items)) {
    if (buzz.ready && ready > 0 && it.hasPlace) moments.push({ inMin: it.inMin - ready, kind: 'ready' })
    if (buzz.start) moments.push({ inMin: it.inMin, kind: 'start' })
    // "5 minutes left": the same events and minute as the orange "WRAP IT UP" label
    if (buzz.end && hasWrapUp(it)) moments.push({ inMin: it.endInMin - WRAP_UP_MIN, kind: 'end' })
  }
  return moments
}

// The kind to buzz now, or null.
//   nowMinute   minuteOf(now) (data/agenda.js)
//   lastBuzzed  () → the absolute minute of the last buzz (0 = never); a function so storage is read
//               only when a moment is actually in the window (a few times a day)
// A moment is due when it lies between LATE_MIN minutes ago and now and is later than the last buzz.
// Several due at once → one buzz. After buzzing, remember nowMinute: it covers every moment just due.
export function dueBuzz(agenda, nowMinute, lastBuzzed) {
  const inWindow = buzzMoments(agenda).filter((m) => m.inMin <= 0 && m.inMin >= -LATE_MIN)
  if (!inWindow.length) return null
  let last = lastBuzzed()
  if (last > nowMinute) last = 0 // the clock was set back: that buzz isn't "later" than anything now
  const due = inWindow.filter((m) => nowMinute + m.inMin > last)
  if (!due.length) return null
  return ORDER.find((kind) => due.some((m) => m.kind === kind))
}
