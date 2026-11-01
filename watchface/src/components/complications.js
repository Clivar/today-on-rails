// Bottom row: weather · heart rate · steps (top 364, from x = 40).
//   compact (the "next" layout): slightly larger, no steps — like the design
//   weather is hidden when the phone sent the agenda without real weather
import ui from '@zos/ui'
import { C, F } from '../ui/theme.js'
import { widget, text, cssTop, setProps, setVisible, setAllVisible } from '../ui/widgets.js'
import { textWidth } from '../ui/text.js'

const TOP = 364
const ICON_Y = 368

export function createComplications() {
  const wxIcon = widget(ui.widget.IMG, { x: 40, y: ICON_Y, src: 'images/weather-21.png' })
  // One temperature widget per size: the system fills in the current temperature
  const temp = { 21: temperature(67, 21), 22: temperature(69, 22) }
  const hrIcon = widget(ui.widget.IMG, { x: 0, y: ICON_Y, src: 'images/heart-21.png' })
  const hrText = text({ x: 0, y: cssTop(TOP, 21, 1.2), w: 60, text_size: 21, font: F.semibold, color: C.text })
  const stIcon = widget(ui.widget.IMG, { x: 0, y: ICON_Y, src: 'images/steps-21.png' })
  const stText = text({ x: 0, y: cssTop(TOP, 21, 1.2), w: 90, text_size: 21, font: F.semibold, color: C.text })

  // Shows what fits the layout; hide() for layouts without the row
  function render(state, { compact }) {
    setAllVisible([hrIcon, hrText], true)
    const size = compact ? 22 : 21
    const gap = compact ? 20 : 16
    let x = 40

    setVisible(wxIcon, state.weather)
    setVisible(temp[21], state.weather && size === 21)
    setVisible(temp[22], state.weather && size === 22)
    if (state.weather) {
      setProps(wxIcon, { x, y: ICON_Y, src: `images/weather-${size}.png` })
      x += size + 6 + textWidth('14°', 'semibold', size) + gap
    }

    // Fresh reading in white; otherwise the resting heart rate in grey
    const hr = state.heart.value > 0 ? '' + state.heart.value : '--'
    setProps(hrIcon, { x, y: ICON_Y, src: `images/heart-${size}.png` })
    setProps(hrText, { x: x + size + 6, y: cssTop(TOP, size, 1.2), text: hr, text_size: size, color: state.heart.fresh ? C.text : C.muted })
    x += size + 6 + textWidth(hr, 'semibold', size) + gap

    setVisible(stIcon, !compact)
    setVisible(stText, !compact)
    if (!compact) {
      setProps(stIcon, { x, y: ICON_Y })
      setProps(stText, { x: x + size + 6, text: thousands(state.steps) })
    }
  }

  function hide() {
    setAllVisible([wxIcon, temp[21], temp[22], hrIcon, hrText, stIcon, stText], false)
  }

  return { render, hide }
}

// System data widget: the watch keeps the current temperature up to date itself
function temperature(x, size) {
  const font = []
  for (let i = 0; i < 10; i++) font.push(`images/temp${size}/d${i}.png`)
  const unit = `images/temp${size}/degree.png`
  return widget(ui.widget.TEXT_IMG, {
    x, y: TOP + 2, w: 50, h: Math.round(size * 1.2), font_array: font, h_space: 0,
    align_h: ui.align.LEFT, type: ui.data_type.WEATHER_CURRENT,
    unit_en: unit, unit_sc: unit, unit_tc: unit,
    negative_image: `images/temp${size}/minus.png`, invalid_image: `images/temp${size}/invalid.png`,
  })
}

const thousands = (n) => ('' + n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
