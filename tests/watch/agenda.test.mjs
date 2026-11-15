// Watch side: agenda parsing, layout choice, formatting (buzz timing: buzzes.test.mjs). Run: npm test
// (What the phone writes vs what the watch reads is checked separately: tests/parity/.)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseAgenda, chooseLayout, itemsAfter, moreSameDay, freeUntil, formatIn, formatLeft, formatSpan, formatWhen, railTarget,
  eventLabel, isWrappingUp, DEFAULT_SETTINGS,
} from '../../watchface/src/data/agenda.js'

const AGENDA =
  'Brussels · 30/10 · C23:00-01:00 Night shift · 31/10 · cfg next=120 focus=15 during=1 ready=60 buzz=start+end+ready · ' +
  'C09:00-10:30 Team call · R18:00 Water the plants · C19:30-20:00 Walk · 1/11 · C@14:00-15:00 Dentist'
const at = (hours, minutes, day = 31, s = AGENDA) => {
  const agenda = parseAgenda(s, { year: 2026, month: 10, day, hours, minutes })
  return { agenda, ...chooseLayout(agenda) }
}

test('settings are read', () => {
  assert.deepEqual(at(12, 0).agenda.settings, {
    next: 120, focus: 15, during: true, ready: 60, rail: 180, buzz: { start: true, end: true, ready: true },
  })
})

test('an overnight event is ongoing after midnight', () => {
  const { layout, subject } = at(0, 30)
  assert.equal(layout, 'focus')
  assert.equal(subject.title, 'Night shift')
  assert.equal(formatLeft(subject.endInMin), '30 min left')
  assert.equal(formatSpan(subject, true), '23:00 – 01:00')
})

test('big clock when nothing is near', () => {
  const { layout, agenda, subject } = at(1, 5)
  assert.equal(layout, 'clear')
  assert.equal(freeUntil(agenda, subject, true), 'Free until 09:00')
})

test('Today card just before an event (focus=15)', () => {
  const { layout, subject } = at(8, 50)
  assert.equal(layout, 'focus')
  assert.equal(formatIn(subject.inMin), 'in 10 min')
})

test('Today card during an event, then the next two items', () => {
  const { layout, agenda, subject } = at(9, 30)
  assert.equal(layout, 'focus')
  assert.ok(subject.ongoing)
  assert.deepEqual(itemsAfter(agenda, subject, 2).map((i) => i.title), ['Water the plants', 'Walk'])
})

test('next layout inside the window (next=120)', () => {
  assert.equal(at(16, 0).layout, 'next')
  assert.equal(at(15, 59).layout, 'clear')
})

test('during=0: an ongoing event uses the next layout', () => {
  const s = AGENDA.replace('during=1', 'during=0')
  const { layout, subject } = at(9, 30, 31, s)
  assert.equal(layout, 'next')
  assert.ok(subject.ongoing)
})

test('free until another day', () => {
  const { layout, agenda, subject } = at(20, 30)
  assert.equal(layout, 'clear')
  assert.equal(freeUntil(agenda, subject, true), 'Free until tomorrow 14:00')
})

test('an event on another day says which day, not just the time', () => {
  // "next" layout the evening before (with a long "next" window): the day leads its label
  const s = AGENDA.replace('next=120', 'next=1200')
  const { layout, subject } = at(20, 15, 31, s)
  assert.equal(layout, 'next')
  assert.equal(subject.title, 'Dentist')
  assert.equal(eventLabel(subject, { is24: true, timeFirst: true }).text, 'TOMORROW 14:00 · IN 17 H 45 MIN')
  assert.equal(eventLabel(subject, { timeFirst: true }).text, 'TOMORROW 2:00 PM · IN 17 H 45 MIN')
  // The Today card's line: the start with its day (the span wouldn't fit with it)
  assert.equal(formatSpan(subject, true), 'Tomorrow 14:00')
  // The Today card's list during the walk: the dentist is tomorrow
  const walk = at(19, 45)
  assert.equal(walk.subject.title, 'Walk')
  assert.deepEqual(itemsAfter(walk.agenda, walk.subject, 2).map((it) => formatWhen(it, true, false)), ['Tomorrow 14:00'])
  // Same day stays just the time
  assert.equal(eventLabel(at(16, 0).subject, { is24: true, timeFirst: true }).text, '18:00 · IN 2 H')
  // An ongoing event that began yesterday keeps its span
  assert.equal(formatSpan(at(0, 30).subject, true), '23:00 – 01:00')
})

test('older strings without settings or end times still work', () => {
  const { agenda, layout } = at(12, 0, 31, 'Brussels · 31/10 · R18:00 Water')
  assert.deepEqual(agenda.settings, DEFAULT_SETTINGS)
  assert.equal(layout, 'next') // 6 h default window
})

test('no agenda yet', () => {
  const { agenda, subject } = at(12, 0, 31, 'Brussels')
  assert.equal(agenda.valid, false)
  assert.equal(freeUntil(agenda, subject, true), 'No agenda from the phone')
})

test('"no weather" hides the weather', () => {
  assert.equal(at(12, 0, 31, AGENDA + ' · no weather').agenda.weather, false)
  assert.equal(at(12, 0).agenda.weather, true)
})

test('year rollover', () => {
  const s = 'X · 31/12 · R23:00 NYE · 1/1 · C10:00-11:00 Brunch'
  const items = parseAgenda(s, { year: 2026, month: 12, day: 31, hours: 22, minutes: 0 }).items
  assert.deepEqual(items.map((i) => [i.title, i.daysAhead, i.inMin]), [['NYE', 0, 60], ['Brunch', 1, 720]])
})

test('an event with a place gets the "get ready" Today card earlier', () => {
  const nov1 = (h, m, s = AGENDA) => chooseLayout(parseAgenda(s, { year: 2026, month: 11, day: 1, hours: h, minutes: m }))
  assert.equal(nov1(12, 50).layout, 'next') // 70 min before: not yet (ready=60), but within next=120
  const { layout, subject, ready } = nov1(13, 5)
  assert.equal(layout, 'focus')
  assert.equal(subject.title, 'Dentist')
  assert.ok(subject.hasPlace)
  assert.equal(ready, true)
  // ready=0 turns it off
  assert.equal(nov1(13, 5, AGENDA.replace('ready=60', 'ready=0')).layout, 'next')
})

test('rail marks the end of an ongoing event, the start of an upcoming one', () => {
  assert.deepEqual(railTarget(at(9, 30).subject), { h: 10.5, hours: 10, minutes: 30 })
  assert.deepEqual(railTarget(at(17, 50).subject), { h: 6, hours: 18, minutes: 0 })
})

test('wrapping up in the last 5 minutes', () => {
  assert.equal(isWrappingUp(at(10, 24).subject), false)
  assert.equal(isWrappingUp(at(10, 25).subject), true)
})


test('a reminder just past is only kept for the buzzer, never shown', () => {
  // 9:31: Stretch (9:30) was a minute ago, during Team call (9:00-10:30)
  const s = AGENDA.replace('C09:00-10:30 Team call', 'C09:00-10:30 Team call · R09:30 Stretch')
  const { agenda, layout, subject } = at(9, 31, 31, s)
  assert.deepEqual(agenda.justPast.map((i) => [i.title, i.inMin]), [['Stretch', -1]])
  assert.ok(!agenda.items.some((i) => i.title === 'Stretch'))
  assert.equal(layout, 'focus')
  assert.equal(subject.title, 'Team call')
  assert.deepEqual(itemsAfter(agenda, subject, 2).map((i) => i.title), ['Water the plants', 'Walk'])
  assert.equal(moreSameDay(agenda, subject), 2)
  // two minutes past it's gone; an event that's over isn't kept at all
  assert.deepEqual(at(9, 32, 31, s).agenda.justPast, [])
  assert.deepEqual(at(10, 31, 31, s).agenda.justPast, [])
  // a moment right now is still an item
  assert.ok(at(9, 30, 31, s).agenda.items.some((i) => i.title === 'Stretch'))
})

// "No update since …": the phone sends the time with the agenda (cfg sent=); when it's older than
// STALE_MIN the phone or Gadgetbridge has stopped, and the face says so instead of "Nothing planned".
test('stale agenda: a notice once the last update is older than STALE_MIN', async () => {
  const { staleNotice, STALE_MIN } = await import('../../watchface/src/data/agenda.js')
  const now = { year: 2026, month: 11, day: 9, hours: 19, minutes: 30, weekDay: 1 }
  const text = (sent) => `Brussels · 9/11 · cfg next=360 focus=30 rail=180 buzz=start${sent} · C21:00-22:00 Call`
  const notice = (sent, is24 = true) => staleNotice(parseAgenda(text(sent), now), now, is24)
  assert.equal(STALE_MIN, 8 * 60)
  assert.equal(notice(' sent=9/11T19:14'), null) // fresh
  assert.equal(notice(' sent=9/11T11:31'), null) // 7 h 59 min: the phone resends every 6 h at least
  assert.equal(notice(' sent=9/11T11:30'), 'No update since 11:30') // the same day: just the time
  assert.equal(notice(' sent=7/11T18:08'), 'No update since Sat 18:08')
  assert.equal(notice(' sent=7/11T18:08', false), 'No update since Sat 6:08 PM')
  assert.equal(notice(''), null) // an older phone app that doesn't send the time: never stale
  assert.equal(notice(' sent=9/11T20:00'), null) // "sent" after now (clocks apart): not stale
  // Sent on 31/12, read on 2/1: last year's date, not this year's
  const jan = { year: 2027, month: 1, day: 2, hours: 9, minutes: 0, weekDay: 6 }
  const old = parseAgenda('X · 31/12 · cfg next=360 sent=31/12T20:00 · R10:00 A', jan)
  assert.equal(staleNotice(old, jan, true), 'No update since Thu 20:00')
})

test('the longest stale notice fits every line that shows it', async () => {
  const { textWidth } = await import('../../watchface/src/ui/text.js')
  const longest = 'No update since Wed 12:58 PM'
  assert.ok(textWidth(longest, 'medium', 20) <= 290, 'clear: Free until line') // freeUntil.js MAX_W
  assert.ok(textWidth(longest, 'medium', 18) <= 246, 'next: the line under the title; Today card list')
})
