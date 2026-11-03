// Always-on clocks. While dimmed the face's code runs only on the minute tick (and not at all off
// the wrist), so the time is drawn by the system: IMG_TIME widgets with digit images (assets
// images/aod156, aod148, aodsmall).
// One per place a clock can be — the big clock of "clear" and of "next", and the Today card's small
// clock — at the same place and in the same fixed-width digit slots as its screen-on twin.
// Each is made the first time a layout shows it (an instance mostly shows one), at the always-on
// level (watchface/index.js draws a set at its level). AM/PM is also handled by the system.
import ui from '@zos/ui'
import { trackedWidget, cssTop } from '../ui/widgets.js'
import { textWidth } from '../ui/text.js'
import { CLOCK, AMPM_SIZE, SMALL_CLOCK } from '../ui/clockSizes.js'

export function createAlwaysOnClock(is24) {
  const big = (g) => imageClock(`images/aod${g.size}/`, g.left, cssTop(g.top, g.size, 0.9), is24, g.ampm)
  const create = {
    clear: () => big(CLOCK.clear),
    next: () => big(CLOCK.next),
    small: () => imageClock('images/aodsmall/', SMALL_CLOCK.left, cssTop(SMALL_CLOCK.top, SMALL_CLOCK.size, 1.2), is24, null),
  }
  const clocks = {}
  let shown = null

  // which: 'clear' | 'next' | 'small' — shows that one, hides the one shown before (new ones show by themselves)
  function render(state, which) {
    if (which === shown) return
    if (shown) clocks[shown].show(false)
    if (clocks[which]) clocks[which].show(true)
    else clocks[which] = create[which]()
    shown = which
  }

  return { render }
}

function imageClock(dir, x, y, is24, ampm) {
  const digits = []
  for (let i = 0; i < 10; i++) digits.push(`${dir}d${i}.png`)
  const colon = `${dir}colon.png`
  const props = {
    hour_zero: is24 ? 1 : 0, hour_startX: x, hour_startY: y, hour_array: digits, hour_space: 0,
    hour_unit_en: colon, hour_unit_sc: colon, hour_unit_tc: colon, hour_align: ui.align.LEFT,
    minute_zero: 1, minute_array: digits, minute_space: 0, minute_follow: 1,
  }
  if (ampm) {
    // Right-aligned at the same spot as the normal clock's AM/PM
    const amX = ampm.right - textWidth('AM', 'semibold', AMPM_SIZE)
    const pmX = ampm.right - textWidth('PM', 'semibold', AMPM_SIZE)
    Object.assign(props, {
      am_x: amX, am_y: ampm.top, am_en_path: 'images/aodampm/am.png', am_sc_path: 'images/aodampm/am.png',
      pm_x: pmX, pm_y: ampm.top, pm_en_path: 'images/aodampm/pm.png', pm_sc_path: 'images/aodampm/pm.png',
    })
  }
  return trackedWidget(ui.widget.IMG_TIME, props) // at the always-on level: the set draws at its level (watchface/index.js)
}
