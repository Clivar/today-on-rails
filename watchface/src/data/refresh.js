// What a face instance builds, and when a refresh has work to do.
// Free of @zos so it's tested in Node (tests/watch/refresh.test.mjs).
import { minuteOf } from './agenda.js'

// Which widget sets an instance builds, from getScene() and @zos/app's SCENE_AOD (the dimmed
// scene; getScene() gave 3 there on the Bip 6, 1 while lit). The watch rebuilds the face on every
// switch between lit and dim, so a dimmed instance builds only the always-on widgets: the cheap
// set, right in the lit → dim switch that lagged. Every other instance builds both: the always-on
// set is only about 18 widgets, and it keeps the dim screen from going black if the watch shows it
// from a lit instance for a moment before the rebuild (or getScene() still said "lit" at build).
// An unknown scene or a missing constant on another firmware also builds both.
export function setsForScene(scene, sceneAod) {
  const dimmed = typeof scene === 'number' && scene === sceneAod
  return { normal: !dimmed, alwaysOn: true }
}

// Everything a refresh depends on, as one string: when it's the same as last time, the screen
// already shows it (the resume right after build, repeated wakes within a minute, a heart reading
// with the same value). The agenda text goes last: whatever it contains, the numbers stay apart.
export function refreshKey({ now, is24, battery, heartLast, steps, cityName }) {
  return [minuteOf(now), is24 ? 24 : 12, battery, heartLast, steps, cityName].join('|')
}
