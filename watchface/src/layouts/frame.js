// The parts every screen-on layout shares, created once:
// background, rail, date, battery, big clock, complications and the record button.
// Each layout decides which of them to show.
import ui from '@zos/ui'
import { W, H, C } from '../ui/theme.js'
import { widget } from '../ui/widgets.js'
import { createRail } from '../components/rail.js'
import { createDate } from '../components/date.js'
import { createBattery } from '../components/battery.js'
import { createClock } from '../components/clock.js'
import { createComplications } from '../components/complications.js'
import { createRecordButton } from '../components/recordButton.js'

export function createFrame() {
  widget(ui.widget.FILL_RECT, { x: 0, y: 0, w: W, h: H, color: C.bg })
  const frame = {
    rail: createRail(),
    date: createDate(C.muted),
    battery: createBattery(),
    clock: createClock(),
    complications: createComplications(),
  }
  createRecordButton()
  return frame
}
