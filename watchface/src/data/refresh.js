// What a face instance builds, and when a refresh has work to do — the face's one cache for
// refreshing. Free of @zos so it's tested in Node (tests/watch/refresh.test.mjs).
import { minuteOf } from './agenda.js'

// The screen the watch shows, from getScene() and @zos/app's SCENE_AOD (the dimmed scene; getScene()
// gave 3 there on the Bip 6, 1 while lit): 'lit' | 'dim' | null (unknown, e.g. a missing constant).
export function screenFromScene(scene, sceneAod) {
  if (typeof scene !== 'number' || typeof sceneAod !== 'number') return null
  return scene === sceneAod ? 'dim' : 'lit'
}

// Which screens an instance builds (ui/screen.js). The watch rebuilds the face on every switch
// between lit and dim, so a dimmed instance builds only the dim screen: the cheap one, right in the
// lit → dim switch. Any other builds both: the dim screen is small, and it keeps the always-on
// display from going black if the watch shows it from a lit instance for a moment before the
// rebuild. An unknown screen builds both too.
export function screensToBuild(screen) {
  return screen === 'dim' ? ['dim'] : ['lit', 'dim']
}

// Everything a refresh depends on, as one string: when it's the same as last time, the screens
// already show it (the wake right after build, repeated wakes within a minute, a heart reading with
// the same value). Battery, heart and steps only count when lit (inputs.lit): the dim screen doesn't
// read or show them. The agenda text goes last: whatever it contains, the numbers stay apart.
export function refreshKey({ now, is24, lit, battery, heartLast, steps, cityName }) {
  const litOnly = lit ? battery + ',' + heartLast + ',' + steps : 'dim'
  return minuteOf(now) + '|' + (is24 ? 24 : 12) + '|' + litOnly + '|' + cityName
}

// Remembers the refresh key of what the screens show. same(key): true when they already show it
// (and otherwise remembers key); forget(): the next refresh draws (a new screen, an error).
export function createRedrawCheck() {
  let last = null
  return {
    same(key) {
      if (key === last) return true
      last = key
      return false
    },
    forget() {
      last = null
    },
  }
}
