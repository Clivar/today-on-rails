// Always-on clocks. While the screen is dimmed the watchface's code doesn't run, so the time is
// drawn by the system: IMG_TIME widgets with digit images (assets images/aod156, aod148, aodsmall).
// One per place a clock can be — the big clock of "clear" and of "next", and the Today card's small
// clock — at the same place and in the same fixed-width digit slots as its screen-on twin.
// The layout shows the one it needs; AM/PM is also handled by the system.
import ui from '@zos/ui'
import { cssTop, setVisible } from '../ui/widgets.js'
import { textWidth } from '../ui/text.js'
import { CLOCK, AMPM_SIZE, SMALL_CLOCK } from '../ui/clockSizes.js'
import { isAlwaysOnDemo } from '../data/state.js'

export function createAlwaysOnClock(is24) {
  const big = (g) => imageClock(`images/aod${g.size}/`, g.left, cssTop(g.top, g.size, 0.9), is24, g.ampm)
  const clocks = {
    clear: big(CLOCK.clear),
    next: big(CLOCK.next),
    small: imageClock('images/aodsmall/', SMALL_CLOCK.left, cssTop(SMALL_CLOCK.top, SMALL_CLOCK.size, 1.2), is24, null),
  }

  // which: 'clear' | 'next' | 'small'
  function render(state, which) {
    for (const name of Object.keys(clocks)) setVisible(clocks[name], name === which)
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
    // The demo shows the always-on layouts on the normal screen
    show_level: isAlwaysOnDemo() ? ui.show_level.ONLY_NORMAL : ui.show_level.ONAL_AOD,
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
  return ui.createWidget(ui.widget.IMG_TIME, props)
}
