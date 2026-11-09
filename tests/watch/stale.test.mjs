// The real face (mocked @zos, zosMock.mjs) with an agenda whose last update is days old — as when
// Gadgetbridge lost the watch after an update (2026-11-07): every layout says "No update since …"
// in orange where it would otherwise claim "Nothing planned" / "Nothing else today" / list the next items.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { installZosMock, SCENE_LIT, SCENE_AOD } from './zosMock.mjs'
import { minuteOf } from '../../watchface/src/data/agenda.js'

const zos = installZosMock()
let face = null
globalThis.WatchFace = (options) => {
  face = options
}
await import('../../watchface/watchface/index.js')
const { C } = await import('../../watchface/src/ui/theme.js')

// Monday 9 Nov 2026, 19:30; the phone last sent on Saturday at 18:08
const NOW = minuteOf({ year: 2026, month: 11, day: 9, hours: 19, minutes: 30 })
const CFG = 'cfg next=360 focus=30 during=1 ready=0 rail=180 buzz=none'
const AGENDA = {
  clear: (sent) => `Brussels · 9/11 · ${CFG}${sent}`,
  next: (sent) => `Brussels · 9/11 · ${CFG}${sent} · C21:00-22:00 Call Sam`,
  focus: (sent) => `Brussels · 9/11 · ${CFG}${sent} · C19:00-20:30 Team call · R21:00 Water the plants`,
}
const STALE = ' sent=7/11T18:08'
const FRESH = ' sent=9/11T19:14'

// The texts on a screen, after a build at NOW
function texts(scene, agenda) {
  zos.state.scene = scene
  zos.state.minute = NOW
  zos.state.agenda = agenda
  zos.state.storage.clear()
  zos.newInstance()
  face.build()
  const level = scene === SCENE_AOD ? 'ONAL_AOD' : 'ONLY_NORMAL'
  return zos.widgets.filter((w) => w.type === 'TEXT' && w.props.show_level === level && w.props.visible !== false)
}
const notice = (ws) => ws.find((w) => /^No update since/.test(w.props.text))

for (const layout of ['clear', 'next', 'focus']) {
  test(`lit ${layout}: "No update since Sat 18:08" in orange when the agenda is old, nothing when fresh`, () => {
    const stale = notice(texts(SCENE_LIT, AGENDA[layout](STALE)))
    assert.ok(stale, 'the notice shows')
    assert.equal(stale.props.text, 'No update since Sat 18:08')
    assert.equal(stale.props.color, C.alert)
    assert.equal(notice(texts(SCENE_LIT, AGENDA[layout](FRESH))), undefined)
  })
}

test('dim clear: the notice in the dim orange instead of "Nothing planned"', () => {
  const ws = texts(SCENE_AOD, AGENDA.clear(STALE))
  assert.equal(notice(ws).props.color, C.dimAlert)
  assert.equal(ws.find((w) => w.props.text === 'Nothing planned'), undefined)
})
