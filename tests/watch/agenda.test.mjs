// Watch side: agenda parsing, layout choice, buzz timing, formatting. Run: npm test
// (What the phone writes vs what the watch reads is checked separately: tests/parity/.)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseAgenda, chooseLayout, itemsAfter, freeUntil, formatIn, formatLeft, formatSpan, railTarget, isWrappingUp,
  DEFAULT_SETTINGS,
} from '../../watchface/src/data/agenda.js'
import { dueBuzz } from '../../watchface/src/data/buzzes.js'

const AGENDA =
  'Brussels · 30/10 · C23:00-01:00 Night shift · 31/10 · cfg next=120 focus=15 during=1 ready=60 buzz=start+end+ready · ' +
  'C09:00-10:30 Team call · R18:00 Water the plants · C19:30-20:00 Walk · 1/11 · C@14:00-15:00 Dentist'
const at = (hours, minutes, day = 31, s = AGENDA) => {
  const agenda = parseAgenda(s, { year: 2026, month: 10, day, hours, minutes })
  return { agenda, ...chooseLayout(agenda) }
}

test('settings are read', () => {
  assert.deepEqual(at(12, 0).agenda.settings, {
    next: 120, focus: 15, during: true, ready: 60, buzz: { start: true, end: true, ready: true },
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

test('buzz moments: start, 5 minutes left, get ready — a minute late is still fine', () => {
  const kind = (h, m, day = 31, month = 10, s = AGENDA) => {
    const due = dueBuzz(parseAgenda(s, { year: 2026, month, day, hours: h, minutes: m }))
    return due && due.kind
  }
  assert.equal(kind(8, 59), null)
  assert.equal(kind(9, 0), 'start')
  assert.equal(kind(9, 1), 'start') // the screen came on a minute late
  assert.equal(kind(9, 2), null)
  assert.equal(kind(10, 25), 'end') // Team call ends 10:30
  assert.equal(kind(18, 0), 'start') // a reminder: start only
  assert.equal(kind(13, 0, 1, 11), 'ready') // Dentist (with a place) at 14:00, ready=60
  assert.equal(kind(9, 0, 31, 10, AGENDA.replace('buzz=start+end+ready', 'buzz=end')), null)
})

test('no buzz settings from the phone: the watch stays quiet', () => {
  assert.equal(dueBuzz(parseAgenda('X · 31/10 · C09:00-10:00 Gym', { year: 2026, month: 10, day: 31, hours: 9, minutes: 0 })), null)
})

