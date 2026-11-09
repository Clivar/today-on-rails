// The heart rate on the lit face (components/complications.js, data/state.js readHeart): a reading
// from the last 10 minutes in white with a pulse icon; otherwise the resting heart rate in grey with
// a calm pulse with zz. Real face, mocked @zos (zosMock.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { installZosMock, SCENE_LIT } from './zosMock.mjs'
import { minuteOf } from '../../watchface/src/data/agenda.js'

const zos = installZosMock()
let face = null
globalThis.WatchFace = (options) => {
  face = options
}
await import('../../watchface/watchface/index.js')
const { C } = await import('../../watchface/src/ui/theme.js')

// The heart icon and its number on a fresh lit build ("clear": nothing planned), with the last
// reading `age` minutes old (the mock's resting heart rate is 58)
function heartRow(age) {
  zos.state.scene = SCENE_LIT
  zos.state.minute = minuteOf({ year: 2026, month: 11, day: 9, hours: 15, minutes: 0 })
  zos.state.agenda = 'Brussels · 9/11 · cfg next=360 focus=30 rail=180 buzz=none'
  zos.state.heart = 72
  zos.state.heartAge = age
  zos.state.storage.clear()
  zos.newInstance()
  face.build()
  const icon = zos.widgets.find((w) => w.type === 'IMG' && /images\/heart/.test(w.props.src))
  // The text right after the icon in the bottom row (y ≈ 364)
  const value = zos.widgets.find((w) => w.type === 'TEXT' && Math.abs(w.props.y - icon.props.y) < 8 && w.props.x > icon.props.x)
  return { icon: icon.props.src, text: value.props.text, color: value.props.color }
}

test('a reading from the last 10 minutes: the value in white, with the pulse icon', () => {
  for (const age of [0, 2, 10]) assert.deepEqual(heartRow(age), { icon: 'images/heart-21.png', text: '72', color: C.text }, `${age} min`)
})

test('older: the resting heart rate in grey, with the calm pulse + zz', () => {
  for (const age of [11, 90]) assert.deepEqual(heartRow(age), { icon: 'images/heart-rest-21.png', text: '58', color: C.muted }, `${age} min`)
})
