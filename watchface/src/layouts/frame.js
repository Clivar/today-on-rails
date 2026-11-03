// The parts the screen-on layouts share: background, rail, date, battery, big clock, complications
// and the record button. Each part is made the first time a layout needs it (the Today card never
// makes the date, battery, big clock or complications), and kept.
//
// Widgets stack in creation order, so the order is fixed here:
//   1. background and rail — with the frame, under everything (the rail's own pieces: components/rail.js);
//   2. the first layout's widgets — its frame parts, always in the order date, battery, big clock,
//      complications (layouts/clear.js and next.js ask for them so), then its own;
//   3. the record button — right after that first layout, so on a fresh build it's on top of everything;
//   4. a layout first shown later in the same instance (rare: the face is rebuilt on every wake and
//      dim) lands above the button. Harmless: no layout draws in the button's box (the rail label and
//      the Today card's list keep clear of it, components/rail.js AVOID and upNext.js RIGHT); only the
//      steps text's empty box reaches into its left edge.
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
  const rail = createRail()
  let date = null
  let battery = null
  let clock = null
  let complications = null
  let button = false

  const frame = {
    rail,
    date: () => date || (date = createDate(C.muted)),
    battery: () => battery || (battery = createBattery()),
    clock: () => clock || (clock = createClock()),
    complications: () => complications || (complications = createComplications()),
    // A layout's widgets (createClearLayout …), then the record button after the first one
    layout(createLayout) {
      const layout = createLayout(frame)
      if (!button) {
        createRecordButton()
        button = true
      }
      return layout
    },
  }
  return frame
}
