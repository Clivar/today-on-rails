// What the dim screen's layouts share: the dim rail, the date and the system-drawn clocks.
// The rail comes with the frame, under everything; the date and the clock are made the first time a
// layout needs them (the Today card has no date; the clock makes only the IMG_TIME it shows). Nothing
// on the dim screen overlaps, so their order doesn't matter.
import { C } from '../../ui/theme.js'
import { lazy } from '../../ui/lazy.js'
import { createDimRail } from '../../components/dimRail.js'
import { createDate } from '../../components/date.js'
import { createDimClock } from '../../components/dimClock.js'

export function createDimFrame(screen, is24) {
  return {
    rail: createDimRail(screen),
    date: lazy(() => createDate(screen, C.dimMuted)),
    clock: lazy(() => createDimClock(screen, is24)),
  }
}
