// What the always-on layouts share: the dim rail, the date and the system-driven clocks.
// Created with setWidgetLevel('alwaysOn') (see watchface/index.js), so these widgets only show when
// the watch is dimmed — never when the wrist is raised.
import { C } from '../ui/theme.js'
import { createAlwaysOnRail } from '../components/alwaysOnRail.js'
import { createDate } from '../components/date.js'
import { createAlwaysOnClock } from '../components/alwaysOnClock.js'

export function createAlwaysOnFrame(is24) {
  return {
    rail: createAlwaysOnRail(),
    date: createDate(C.aodMuted),
    clock: createAlwaysOnClock(is24),
  }
}
