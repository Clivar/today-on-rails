// Bottom row: weather · heart rate · steps (top 364, from x = 40).
//   compact (the "next" layout): slightly larger, no steps — like the design
//   weather is hidden when the phone sent the agenda without real weather
import ui from '@zos/ui'
import { C, F } from '../ui/theme.js'
import { cssTop, showAll } from '../ui/widgets.js'
import { textWidth } from '../ui/text.js'

const TOP = 364
const ICON_Y = 368

export function createComplications(screen) {
  const wxIcon = screen.widget(ui.widget.IMG, { x: 40, y: ICON_Y, src: 'images/weather-21.png' })
  // One temperature widget per size: the system fills in the current temperature
  const temp = { 21: temperature(screen, 67, 21), 22: temperature(screen, 69, 22) }
  const hrIcon = screen.widget(ui.widget.IMG, { x: 0, y: ICON_Y, src: 'images/heart-21.png' })
  const hrText = screen.text({ x: 0, y: cssTop(TOP, 21, 1.2), w: 60, text_size: 21, font: F.semibold, color: C.text })
  const stIcon = screen.widget(ui.widget.IMG, { x: 0, y: ICON_Y, src: 'images/steps-21.png' })
  const stText = screen.text({ x: 0, y: cssTop(TOP, 21, 1.2), w: 90, text_size: 21, font: F.semibold, color: C.text })

  // Shows what fits the layout; hide() for layouts without the row
  function render(state, { compact }) {
    hrIcon.show(true)
    hrText.show(true)
    const size = compact ? 22 : 21
    const gap = compact ? 20 : 16
    let x = 40

    wxIcon.show(state.weather)
    temp[21].show(state.weather && size === 21)
    temp[22].show(state.weather && size === 22)
    if (state.weather) {
      wxIcon.set({ x, y: ICON_Y, src: `images/weather-${size}.png` })
      x += size + 6 + textWidth('14°', 'semibold', size) + gap
    }

    // Fresh reading in white; otherwise the resting heart rate in grey
    const hr = state.heart.value > 0 ? '' + state.heart.value : '--'
    hrIcon.set({ x, y: ICON_Y, src: `images/heart-${size}.png` })
    hrText.set({ x: x + size + 6, y: cssTop(TOP, size, 1.2), text: hr, text_size: size, color: state.heart.fresh ? C.text : C.muted })
    x += size + 6 + textWidth(hr, 'semibold', size) + gap

    stIcon.show(!compact)
    stText.show(!compact)
    if (!compact) {
      stIcon.set({ x, y: ICON_Y })
      stText.set({ x: x + size + 6, text: thousands(state.steps) })
    }
  }

  function hide() {
    showAll([wxIcon, temp[21], temp[22], hrIcon, hrText, stIcon, stText], false)
  }

  return { render, hide }
}

// System data widget: the watch keeps the current temperature up to date itself (only its place and
// visibility are ours)
function temperature(screen, x, size) {
  const font = []
  for (let i = 0; i < 10; i++) font.push(`images/temp${size}/d${i}.png`)
  const unit = `images/temp${size}/degree.png`
  return screen.widget(ui.widget.TEXT_IMG, {
    x, y: TOP + 2, w: 50, h: Math.round(size * 1.2), font_array: font, h_space: 0,
    align_h: ui.align.LEFT, type: ui.data_type.WEATHER_CURRENT,
    unit_en: unit, unit_sc: unit, unit_tc: unit,
    negative_image: `images/temp${size}/minus.png`, invalid_image: `images/temp${size}/invalid.png`,
  })
}

const thousands = (n) => ('' + n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
