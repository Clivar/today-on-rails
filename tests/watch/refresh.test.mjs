// A face instance builds only the widgets its scene shows, and skips refreshes with nothing new
// (the watch rebuilds the face on every lit ↔ dim switch; building and drawing everything made it lag).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setsForScene, refreshKey } from '../../watchface/src/data/refresh.js'

// @zos/app's SCENE_AOD; on the Bip 6 getScene() gave 3 while dimmed, 1 while lit
const SCENE_AOD = 3

test('a dimmed instance builds only the always-on set', () => {
  assert.deepEqual(setsForScene(3, SCENE_AOD), { normal: false, alwaysOn: true })
})

test('a lit instance builds both sets: the dim screen never goes black before the rebuild', () => {
  assert.deepEqual(setsForScene(1, SCENE_AOD), { normal: true, alwaysOn: true })
})

test('an unknown scene or a missing constant builds both sets', () => {
  for (const scene of [undefined, null, 0, 2, 4, 'x', '3']) {
    assert.deepEqual(setsForScene(scene, SCENE_AOD), { normal: true, alwaysOn: true }, String(scene))
  }
  // SCENE_AOD missing on another firmware, getScene() throwing (undefined): never "dimmed"
  assert.deepEqual(setsForScene(3, undefined), { normal: true, alwaysOn: true })
  assert.deepEqual(setsForScene(undefined, undefined), { normal: true, alwaysOn: true })
})

const inputs = {
  now: { year: 2026, month: 11, day: 3, hours: 9, minutes: 41, weekDay: 2 },
  is24: true, battery: 80, heartLast: 62, steps: 4210,
  cityName: 'Brussels · 3/11 · cfg next=360 · C10:00-11:00 Team call',
}

test('the same inputs give the same key', () => {
  assert.equal(refreshKey(inputs), refreshKey({ ...inputs, now: { ...inputs.now } }))
})

test('every input that shows on the face changes the key', () => {
  const changes = {
    minute: { now: { ...inputs.now, minutes: 42 } },
    day: { now: { ...inputs.now, day: 4 } },
    month: { now: { ...inputs.now, month: 12 } },
    clock: { is24: false },
    battery: { battery: 79 },
    heart: { heartLast: 63 },
    steps: { steps: 4211 },
    agenda: { cityName: inputs.cityName + ' · R12:00 Lunch' },
    weather: { cityName: inputs.cityName + ' · no weather' },
  }
  for (const [name, change] of Object.entries(changes)) {
    assert.notEqual(refreshKey({ ...inputs, ...change }), refreshKey(inputs), name)
  }
})
