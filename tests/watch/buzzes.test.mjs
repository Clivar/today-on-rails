// Watch side: when the watch buzzes (watchface/src/data/buzzes.js). Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseAgenda, minuteOf } from '../../watchface/src/data/agenda.js'
import { buzzMoments, dueBuzz } from '../../watchface/src/data/buzzes.js'

const AGENDA =
  'Brussels · 31/10 · cfg ready=60 buzz=start+end+ready · ' +
  'C09:00-10:30 Team call · R18:00 Water the plants · C19:30-19:35 Quick sync · 1/11 · C@14:00-15:00 Dentist'

const time = (hours, minutes, day = 31, month = 10) => ({ year: 2026, month, day, hours, minutes })

// The kind due at a time with nothing buzzed before
const kind = (hours, minutes, day = 31, month = 10, s = AGENDA) => {
  const now = time(hours, minutes, day, month)
  return dueBuzz(parseAgenda(s, now), minuteOf(now), () => 0)
}

// A watch that keeps the last buzz minute like components/buzzer.js does (storage survives rebuilds)
const watch = (s = AGENDA) => {
  let last = 0
  return (hours, minutes, day = 31, month = 10) => {
    const now = time(hours, minutes, day, month)
    const due = dueBuzz(parseAgenda(s, now), minuteOf(now), () => last)
    if (due) last = minuteOf(now)
    return due
  }
}

test('start, 5 minutes left and get ready buzz at their minute', () => {
  assert.equal(kind(8, 59), null)
  assert.equal(kind(9, 0), 'start')
  assert.equal(kind(10, 24), null)
  assert.equal(kind(10, 25), 'end') // Team call ends 10:30
  assert.equal(kind(18, 0), 'start') // a reminder: start only
  assert.equal(kind(13, 0, 1, 11), 'ready') // Dentist (with a place) at 14:00, ready=60
  assert.equal(kind(12, 59, 1, 11), null)
})

test('a minute late still buzzes (the screen came on just after), two minutes late not', () => {
  assert.equal(kind(9, 1), 'start')
  assert.equal(kind(9, 2), null)
  assert.equal(kind(10, 26), 'end')
  assert.equal(kind(10, 27), null)
})

test('a reminder still buzzes a minute late (kept in agenda.justPast), two minutes late not', () => {
  assert.equal(kind(18, 1), 'start')
  assert.equal(kind(18, 2), null)
  const at = watch()
  assert.equal(at(18, 0), 'start')
  assert.equal(at(18, 1), null) // already buzzed for it
})

test('no double buzz in the same minute or for the late minute (rebuilds)', () => {
  const at = watch()
  assert.equal(at(9, 0), 'start')
  assert.equal(at(9, 0), null) // the face was rebuilt (lit ↔ dim) in the same minute
  assert.equal(at(9, 1), null) // the same moment, now a minute late
})

test("the next minute's moment still buzzes after a buzz", () => {
  // Quick sync 19:30-19:35 is too short for an end buzz; use two events a minute apart
  const at = watch('X · 31/10 · cfg buzz=start · C09:00-09:30 A · C09:01-09:30 B')
  assert.equal(at(9, 0), 'start')
  assert.equal(at(9, 1), 'start') // B, though A's start is still in the late minute
  assert.equal(at(9, 2), null)
})

test('two moments in one minute: one buzz, the most pressing kind', () => {
  // 10:25: Team call has 5 minutes left and the next event starts
  const s = 'X · 31/10 · cfg ready=35 buzz=start+end+ready · C09:00-10:30 Team call · C10:25-11:00 Talk · C@11:00-12:00 Visit'
  assert.equal(kind(10, 25, 31, 10, s), 'start') // start + end + ready (11:00 - 35)
  const at = watch(s)
  assert.equal(at(10, 25), 'start')
  assert.equal(at(10, 25), null) // all three were covered by that one buzz
  assert.equal(at(10, 26), null)
  // The face was paused: the late moment and the current one together, still one buzz
  const paused = watch('X · 31/10 · cfg buzz=start+end · C09:00-09:10 A · C09:06-10:00 B')
  assert.equal(paused(9, 6), 'start') // A's end buzz at 9:05 (late) and B's start at 9:06
  assert.equal(paused(9, 6), null)
})

test('short events have no end buzz', () => {
  assert.equal(kind(19, 30), 'start') // Quick sync, 5 minutes
  assert.equal(kind(19, 30, 31, 10, AGENDA.replace('buzz=start+end+ready', 'buzz=end')), null)
  const kinds = buzzMoments(parseAgenda('X · 31/10 · cfg buzz=start+end · C09:00-09:09 A', time(8, 0))).map((m) => m.kind)
  assert.deepEqual(kinds, ['start'])
  // exactly 10 minutes is long enough
  assert.equal(kind(9, 5, 31, 10, 'X · 31/10 · cfg buzz=end · C09:00-09:10 A'), 'end')
})

test('buzz settings off: the watch stays quiet', () => {
  assert.equal(kind(9, 0, 31, 10, 'X · 31/10 · C09:00-10:00 Gym'), null) // no settings from the phone
  assert.equal(kind(9, 0, 31, 10, AGENDA.replace('buzz=start+end+ready', 'buzz=none')), null)
  assert.equal(kind(9, 0, 31, 10, AGENDA.replace('buzz=start+end+ready', 'buzz=end')), null)
  assert.equal(kind(13, 0, 1, 11, AGENDA.replace('ready=60', 'ready=0')), null) // ready buzz needs a ready time
  assert.equal(kind(9, 0, 31, 10, 'no agenda'), null)
})

test('storage is only read when a moment is in the window', () => {
  let reads = 0
  const lastBuzzed = () => { reads++; return 0 }
  const now = time(12, 0)
  dueBuzz(parseAgenda(AGENDA, now), minuteOf(now), lastBuzzed)
  assert.equal(reads, 0)
  const nine = time(9, 0)
  dueBuzz(parseAgenda(AGENDA, nine), minuteOf(nine), lastBuzzed)
  assert.equal(reads, 1)
})

test('clock set back: a last buzz in the future is ignored', () => {
  const at = watch()
  assert.equal(at(10, 25), 'end')
  assert.equal(at(9, 0), 'start') // the clock went back an hour and a half
  assert.equal(at(9, 0), null)
})

test('a daily event buzzes again the next day', () => {
  const daily = (day) => `X · ${day}/10 · cfg buzz=start · C09:00-09:15 Standup`
  let last = 0
  for (const day of [30, 31]) {
    const now = time(9, 0, day)
    const due = dueBuzz(parseAgenda(daily(day), now), minuteOf(now), () => last)
    assert.equal(due, 'start')
    last = minuteOf(now)
    const late = time(9, 1, day)
    assert.equal(dueBuzz(parseAgenda(daily(day), late), minuteOf(late), () => last), null)
  }
})
