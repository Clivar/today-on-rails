// Small helpers around @zos/ui so components read like the design.
import ui from '@zos/ui'
import { W } from './theme.js'

// Every widget says when it shows: normal widgets only while the screen is lit, always-on widgets
// only while it's dimmed (like Zepp's own always-on watchface samples). Unflagged widgets would
// show in both and cover the dim screen.
let level = 'normal' // 'normal' | 'alwaysOn'

// Creates widgets at a level: withWidgetLevel('alwaysOn', () => createAlwaysOnFrame())
export function withWidgetLevel(next, create) {
  const before = level
  level = next
  try {
    return create()
  } finally {
    level = before
  }
}

export function widget(type, props) {
  const show_level = level === 'alwaysOn' ? ui.show_level.ONAL_AOD : ui.show_level.ONLY_NORMAL
  return ui.createWidget(type, { ...props, show_level })
}

// The watch lays text out from the top of a 1.2em box (Barlow: ascent 1.0 + descent 0.2).
// cssTop converts a CSS text box from the design (top, font-size, line-height) to widget y.
export const cssTop = (top, size, lineHeight) => Math.round(top + ((lineHeight - 1.2) * size) / 2)
export const lineBox = (size) => Math.ceil(size * 1.2) + 2

export function text(props) {
  return widget(ui.widget.TEXT, {
    w: W, h: lineBox(props.text_size), align_h: ui.align.LEFT, align_v: ui.align.TOP,
    text_style: ui.text_style.NONE, text: '', ...props,
  })
}

export const setText = (w, s) => w.setProperty(ui.prop.TEXT, s)
export const setProps = (w, props) => w.setProperty(ui.prop.MORE, props)
export const setVisible = (w, on) => w.setProperty(ui.prop.VISIBLE, !!on)
export const setAllVisible = (list, on) => list.forEach((w) => setVisible(w, on))
