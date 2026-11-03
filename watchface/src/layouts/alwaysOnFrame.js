// What the always-on layouts share: the dim rail, the date and the system-driven clocks.
// Created at the 'alwaysOn' widget level (see watchface/index.js), so these widgets only show when
// the watch is dimmed — never when the wrist is raised.
// The rail comes with the frame, under everything; the date and the clock are made the first time a
// layout needs them (the Today card has no date; the clock makes only the IMG_TIME it shows). Nothing
// on the dim screen overlaps, so their order doesn't matter.
import { C } from '../ui/theme.js'
import { createAlwaysOnRail } from '../components/alwaysOnRail.js'
import { createDate } from '../components/date.js'
import { createAlwaysOnClock } from '../components/alwaysOnClock.js'

export function createAlwaysOnFrame(is24) {
  const rail = createAlwaysOnRail()
  let date = null
  let clock = null
  return {
    rail,
    date: () => date || (date = createDate(C.aodMuted)),
    clock: () => clock || (clock = createAlwaysOnClock(is24)),
  }
}
