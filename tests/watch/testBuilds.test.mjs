// The test builds' agendas (tools/test-builds/, built with tools/build.sh <test>): each text must be one
// the real parser reads, and show the intended layouts and buzzes at the intended moments.
// As on the watch (tools/test-builds/shared/agendaSource.js): absolute minutes, laid out from the first run.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseAgenda, chooseLayout, minuteOf, eventLabel, freeUntil, itemsAfter, startsOnRail, railTarget, railHour,
} from '../../watchface/src/data/agenda.js'
import { dueBuzz } from '../../watchface/src/data/buzzes.js'
import { railPieces } from '../../watchface/src/ui/railGeometry.js'
import * as buzz from '../../tools/test-builds/buzz.js'
import * as demo from '../../tools/test-builds/demo.js'
import * as wrapUp from '../../tools/test-builds/wrap-up.js'
import * as rail from '../../tools/test-builds/rail.js'

// Absolute minute → the watch's `now`
const nowAt = (minute) => {
  const d = new Date(minute * 60000)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hours: d.getUTCHours(), minutes: d.getUTCMinutes() }
}
const FIRST = minuteOf({ year: 2026, month: 11, day: 3, hours: 9, minutes: 42 }) // installed at 9:42

// What the face sees `after` minutes past the first run
function face(build, after, first = FIRST) {
  const minute = first + after
  const agenda = parseAgenda(build.agendaText(minute, first), nowAt(minute))
  assert.equal(agenda.valid, true)
  return { minute, agenda, ...chooseLayout(agenda) }
}

// A watch running the build minute by minute; the last buzz kept as components/buzzer.js does
function buzzesOver(build, minutes, first = FIRST) {
  let last = 0
  const buzzed = []
  for (let after = 0; after < minutes; after++) {
    const { minute, agenda } = face(build, after, first)
    const kind = dueBuzz(agenda, minute, () => last)
    if (kind) {
      last = minute
      buzzed.push([after, kind])
    }
  }
  return buzzed
}

test('buzz: the start buzz once every minute for an hour, then quiet', () => {
  const buzzed = buzzesOver(buzz, 90)
  assert.deepEqual(buzzed, Array.from({ length: buzz.MINUTES }, (_, i) => [i, 'start']))
  const { layout, subject, agenda } = face(buzz, 5)
  assert.equal(layout, 'next')
  assert.equal(subject.title, 'Buzz 7 of 60')
  assert.equal(agenda.items.length, 2) // this minute's and the next: two dots on the rail, not 60
  assert.equal(face(buzz, 59).agenda.items.length, 1)
  assert.equal(face(buzz, 60).layout, 'clear')
})

test('buzz: around midnight too', () => {
  const late = minuteOf({ year: 2026, month: 12, day: 31, hours: 23, minutes: 30 })
  assert.equal(buzzesOver(buzz, 61, late).length, 60)
})

test('demo: walks through every layout', () => {
  // t0 = 9:40 (the first run, rounded down to 5)
  const at = (after) => {
    const f = face(demo, after)
    return [f.layout, f.subject && f.subject.title, !!f.ready]
  }
  assert.deepEqual(at(0), ['focus', 'Team call', false]) // on: the Today card
  const card = face(demo, 0)
  assert.equal(eventLabel(card.subject).text, 'NOW · 1 H 13 MIN LEFT')
  assert.deepEqual(itemsAfter(card.agenda, card.subject, 2).map((i) => i.title), ['Water the plants', 'Walk the dog'])
  assert.equal(eventLabel(face(demo, 67).subject).wrapUp, false)
  assert.deepEqual(eventLabel(face(demo, 70).subject), { text: 'WRAP IT UP · 3 MIN LEFT', wrapUp: true })
  assert.deepEqual(at(80), ['next', 'Walk the dog', false])
  assert.deepEqual(at(100), ['focus', 'Dentist', true]) // get ready (ready=60)
  assert.deepEqual(at(160), ['focus', 'Dentist', false])
  assert.deepEqual(at(200), ['next', 'Call Sam', false])
  const free = face(demo, 300)
  assert.equal(free.layout, 'clear')
  assert.equal(freeUntil(free.agenda, free.subject, true), 'Free until tomorrow 10:00')
  assert.equal(free.agenda.weather, true)
  assert.equal(buzzesOver(demo, 400).length, 0) // quiet
})

test('demo: after the last event, the review is at least 12 hours away (a day later if need be)', () => {
  for (const hours of [0, 9, 20, 23]) {
    const first = minuteOf({ year: 2026, month: 11, day: 3, hours, minutes: 0 })
    const f = face(demo, 300, first)
    assert.equal(f.layout, 'clear')
    assert.equal(f.subject.title, 'Weekly review')
    assert.ok(f.subject.inMin >= 12 * 60 && f.subject.inMin < 36 * 60, `first run ${hours}:00`)
  }
})

test('wrap-up: the label and the end buzz 3 minutes after installing, then the next event', () => {
  assert.equal(eventLabel(face(wrapUp, 2).subject).wrapUp, false)
  const { layout, subject } = face(wrapUp, 3)
  assert.equal(layout, 'focus')
  assert.deepEqual(eventLabel(subject), { text: 'WRAP IT UP · 5 MIN LEFT', wrapUp: true })
  assert.deepEqual(buzzesOver(wrapUp, 10), [[3, 'end']])
  const after = face(wrapUp, 9)
  assert.deepEqual([after.layout, after.subject.title], ['next', 'Call Sam'])
})

test('rail: whatever the time, the arc crosses a corner and dots sit at 12, 6 and in every corner', () => {
  const inCorner = (h) => railPieces(h, h + 0.01).some((p) => p.kind === 'corner')
  for (let minute = FIRST; minute < FIRST + 1440; minute += 7) {
    const { agenda, layout, subject, minute: m } = face(rail, 0, minute)
    const now = nowAt(m)
    assert.equal(layout, 'next')
    assert.ok(subject.ongoing)
    const target = railTarget(subject)
    assert.ok(target && subject.endInMin <= agenda.settings.rail) // the lime arc shows
    const nowH = railHour(now.hours, now.minutes)
    assert.ok(railPieces(nowH, target.h).some((p) => p.kind === 'corner'))
    // Dots: a reminder on every hour position (the now dot isn't on a full hour, so it doesn't count)
    const dots = agenda.items.filter((it) => it !== subject && startsOnRail(it)).map((it) => railHour(it.hours, it.minutes))
    assert.deepEqual([...dots].sort((a, b) => a - b), Array.from({ length: 12 }, (_, h) => h), `at ${now.hours}:${now.minutes}`)
  }
  for (const h of [1, 5, 7, 11]) assert.ok(inCorner(h), `${h}:00 is in a corner`)
  for (const h of [0, 6]) assert.ok(!inCorner(h))
})
