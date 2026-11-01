// Parity, watch side: the watchface must read exactly what the phone app writes.
// Each case in cases.json has the agenda text the Android app produces (checked by
// android/app/src/test/.../AgendaParityTest.kt); here the watch parses it and must see `watchSees`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { parseAgenda } from '../../watchface/src/data/agenda.js'

const { cases } = JSON.parse(fs.readFileSync(new URL('./cases.json', import.meta.url), 'utf8'))
const pad = (n) => (n < 10 ? '0' : '') + n
const hhmm = (h, m) => (h === null ? null : `${pad(h)}:${pad(m)}`)

for (const c of cases) {
  test(c.name, () => {
    const [date, time] = c.watchNow.split('T')
    const [year, month, day] = date.split('-').map(Number)
    const [hours, minutes] = time.split(':').map(Number)
    const agenda = parseAgenda(c.text, { year, month, day, hours, minutes })

    assert.equal(agenda.valid, true)
    assert.equal(agenda.weather, c.watchSees.weather)
    assert.deepEqual(agenda.settings, c.watchSees.settings)
    assert.deepEqual(
      agenda.items.map((it) => ({
        kind: it.kind,
        title: it.title,
        start: hhmm(it.hours, it.minutes),
        end: hhmm(it.endHours, it.endMinutes),
        daysAhead: it.daysAhead,
        place: it.hasPlace,
        ongoing: it.ongoing,
      })),
      c.watchSees.items,
    )
  })
}
