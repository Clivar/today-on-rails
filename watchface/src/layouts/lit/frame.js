// The parts the lit layouts share: background, rail, date, battery, big clock and complications.
// Each part is made the first time a layout needs it (ui/lazy.js: the Today card never makes the date,
// battery, big clock or complications), and kept.
//
// Widgets stack in creation order, so the order is fixed here:
//   1. background and rail — with the frame, under everything (the rail's own pieces: components/rail.js);
//   2. a layout's widgets — its frame parts, always in the order date, battery, big clock,
//      complications (layouts/lit/clear.js and next.js ask for them so), then its own.
import ui from '@zos/ui'
import { W, H, C } from '../../ui/theme.js'
import { lazy } from '../../ui/lazy.js'
import { createRail } from '../../components/rail.js'
import { createDate } from '../../components/date.js'
import { createBattery } from '../../components/battery.js'
import { createClock } from '../../components/clock.js'
import { createComplications } from '../../components/complications.js'

export function createFrame(screen) {
  screen.widget(ui.widget.FILL_RECT, { x: 0, y: 0, w: W, h: H, color: C.bg })
  return {
    rail: createRail(screen),
    date: lazy(() => createDate(screen, C.muted)),
    battery: lazy(() => createBattery(screen)),
    clock: lazy(() => createClock(screen)),
    complications: lazy(() => createComplications(screen)),
  }
}
