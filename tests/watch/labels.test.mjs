// The small upper-case label above an event's title (Today card and "next" layout): wording,
// the wrap-up in the last minutes, and that the longest labels fit their boxes. Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseAgenda, chooseLayout, eventLabel, hasWrapUp, WRAP_UP_MIN } from '../../watchface/src/data/agenda.js'
import { textWidth } from '../../watchface/src/ui/text.js'

const AGENDA =
  'Brussels · 31/10 · cfg next=720 focus=15 during=1 ready=120 buzz=start+end · ' +
  'C09:00-10:30 Team call · R18:00 Water the plants · C@22:30-23:30 Dentist'
const subjectAt = (hours, minutes) => {
  const agenda = parseAgenda(AGENDA, { year: 2026, month: 10, day: 31, hours, minutes })
  return chooseLayout(agenda)
}
const label = (hours, minutes, opts) => {
  const { subject, ready } = subjectAt(hours, minutes)
  return eventLabel(subject, { ready, ...opts })
}

test('upcoming: countdown, or the start time first on the "next" layout', () => {
  assert.deepEqual(label(8, 50, { is24: true }), { text: 'NEXT · IN 10 MIN', wrapUp: false })
  assert.deepEqual(label(16, 2, { is24: true, timeFirst: true }), { text: '18:00 · IN 1 H 58 MIN', wrapUp: false })
  assert.equal(label(16, 2, { timeFirst: true }).text, '6:00 PM · IN 1 H 58 MIN')
})

test('get ready: an event with a place, earlier than the usual card', () => {
  assert.deepEqual(label(21, 32, { is24: true }), { text: 'GET READY · IN 58 MIN', wrapUp: false })
  assert.equal(label(21, 32, { is24: true, fixedTimes: true }).text, 'GET READY · 22:30')
})

test('ongoing: time left', () => {
  assert.deepEqual(label(10, 5, { is24: true }), { text: 'NOW · 25 MIN LEFT', wrapUp: false })
})

test('wrap-up: the last 5 minutes say so', () => {
  assert.equal(WRAP_UP_MIN, 5)
  assert.deepEqual(label(10, 24), { text: 'NOW · 6 MIN LEFT', wrapUp: false })
  assert.deepEqual(label(10, 25), { text: 'WRAP IT UP · 5 MIN LEFT', wrapUp: true })
  assert.deepEqual(label(10, 29), { text: 'WRAP IT UP · 1 MIN LEFT', wrapUp: true })
  // The "next" layout says it the same way
  assert.deepEqual(label(10, 27, { timeFirst: true }), { text: 'WRAP IT UP · 3 MIN LEFT', wrapUp: true })
  // Over: the next event, no wrap-up
  assert.equal(label(10, 30).wrapUp, false)
})

test('fixed times (always-on card)', () => {
  assert.equal(label(8, 50, { is24: true, fixedTimes: true }).text, 'NEXT · 09:00')
  assert.equal(label(10, 5, { is24: true, fixedTimes: true }).text, 'NOW · UNTIL 10:30')
  assert.equal(label(10, 5, { fixedTimes: true }).text, 'NOW · UNTIL 10:30 AM')
  assert.deepEqual(label(10, 26, { is24: true, fixedTimes: true }), { text: 'WRAP IT UP · UNTIL 10:30', wrapUp: true })
  // Reminders have no end, so no wrap-up
  assert.equal(label(17, 58, { fixedTimes: true }).text, 'NEXT · 6:00 PM')
})

test('short events: no wrap-up (as with the "end" buzz)', () => {
  // [agenda items, hours, minutes] → the subject's label
  const at = (items, hours, minutes) => {
    const agenda = parseAgenda(`Brussels · 31/10 · cfg during=1 · ${items}`, { year: 2026, month: 10, day: 31, hours, minutes })
    const { subject, ready } = chooseLayout(agenda)
    return eventLabel(subject, { ready })
  }
  // A 5-minute stand-up, from its first minute
  assert.deepEqual(at('C10:00-10:05 Standup', 10, 0), { text: 'NOW · 5 MIN LEFT', wrapUp: false })
  // 8 minutes, 3 minutes in
  assert.deepEqual(at('C10:05-10:13 Sync', 10, 8), { text: 'NOW · 5 MIN LEFT', wrapUp: false })
  // 10 minutes is long enough
  assert.deepEqual(at('C10:00-10:10 Check-in', 10, 5), { text: 'WRAP IT UP · 5 MIN LEFT', wrapUp: true })
  assert.equal(hasWrapUp({ kind: 'reminder', inMin: 0, endInMin: 0 }), false)
})

// The longest labels the settings allow, built by eventLabel (so a change of wording is measured too),
// at 24- and 12-hour time. Phone choices: ready ≤ 120 min, Today card ≤ 60 min, "next" layout ≤ 720 min.
const worst = (items, [day, hours, minutes], opts) =>
  [true, false].map((is24) => {
    const agenda = parseAgenda(`Brussels · 31/10 · cfg next=720 ready=120 · ${items}`, { year: 2026, month: 10, day, hours, minutes })
    const { subject, ready } = chooseLayout(agenda)
    return eventLabel(subject, { ready, is24, ...opts }).text
  })
const NIGHT_TRAIN = '1/11 · C@00:30-01:30 Night train'
const ALL_DAY = 'C10:00-09:59 All day and night'
const LUNCH = 'C10:00-12:30 Lunch'
const longestToday = [
  ...worst(NIGHT_TRAIN, [31, 22, 31]), // get ready, 1 h 59 min ahead
  ...worst(NIGHT_TRAIN, [31, 23, 30], { fixedTimes: true }), // always-on: tomorrow 12:30 AM
  ...worst(ALL_DAY, [31, 10, 0]), // 23 h 59 min left
  ...worst(LUNCH, [31, 12, 25]), // wrap-up, 5 min left
  ...worst(LUNCH, [31, 12, 25], { fixedTimes: true }), // always-on: until 12:30 PM
]
const longestNext = [
  ...worst('C12:30-13:30 Lunch', [31, 0, 31], { timeFirst: true }), // 11 h 59 min ahead
  ...worst(ALL_DAY, [31, 10, 0], { timeFirst: true }),
  ...worst(LUNCH, [31, 12, 25], { timeFirst: true }),
]

test('the worst cases are what they should be', () => {
  for (const s of [
    'GET READY · IN 1 H 59 MIN', 'GET READY · TOMORROW 12:30 AM', 'NOW · 23 H 59 MIN LEFT', 'WRAP IT UP · 5 MIN LEFT',
    'WRAP IT UP · UNTIL 12:30 PM',
  ]) assert.ok(longestToday.includes(s), `${s} in ${longestToday}`)
  assert.ok(longestNext.includes('12:30 PM · IN 11 H 59 MIN'), `${longestNext}`)
})

// TEXT widgets set char_space 2 between characters
const width = (s, size) => textWidth(s, 'bold', size, 2)

test('the longest labels fit the Today card (17 px bold, 330 wide)', () => {
  for (const s of longestToday) assert.ok(width(s, 17) <= 330, `${s}: ${width(s, 17)} px`)
})

test('the longest labels fit the "next" layout (16 px bold, 330 wide)', () => {
  for (const s of longestNext) assert.ok(width(s, 16) <= 330, `${s}: ${width(s, 16)} px`)
})
