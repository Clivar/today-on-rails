// Widgets: every widget the face makes is a Widget, made by a screen (ui/screen.js: screen.widget()
// and screen.text()), which also decides when it shows (lit or dim).
//
// A Widget remembers what it last told the watch and skips a write that changes nothing. This is the
// face's one cache for drawing: every setProperty is a slow call into the system, and a minute
// refresh would otherwise resend nearly everything while only the time changed. Components just
// write what they want shown (set / setText / show / place).
// Widgets the system draws itself (IMG_TIME, the temperature's TEXT_IMG) change their own content:
// only what we write (place, visibility) is remembered, never what they show.
import ui from '@zos/ui'
import { W } from './theme.js'

// No object spread ({ ...props }) in the face: on the watch each one costs about 4 ms (measured with
// tools/build.sh perf; tests/watch/noSpread.test.mjs). Widgets keep the props object they were made
// with (filled in, never copied).
export class Widget {
  constructor(raw, props) {
    this.raw = raw
    this.last = props // what the watch has: the creation props, updated by every write
    this.shown = true // new widgets show
  }

  // Changes props (all of them in one call, as given) if any differs; visibility as it is
  set(props) {
    const last = this.last
    for (const k in props) {
      if (props[k] !== last[k]) {
        this.raw.setProperty(ui.prop.MORE, props)
        for (const j in props) last[j] = props[j]
        return
      }
    }
  }

  setText(s) {
    if (s === this.last.text) return
    this.raw.setProperty(ui.prop.TEXT, s)
    this.last.text = s
  }

  show(on) {
    on = !!on
    if (on === this.shown) return
    this.raw.setProperty(ui.prop.VISIBLE, on)
    this.shown = on
  }

  // Shows it with these props
  place(props) {
    this.set(props)
    this.show(true)
  }
}

export function showAll(widgets, on) {
  for (let i = 0; i < widgets.length; i++) widgets[i].show(on)
}

// A TEXT widget's props; what props leaves out: full width, one line high, top left, no wrapping, empty
export function textProps(props) {
  if (props.w === undefined) props.w = W
  if (props.h === undefined) props.h = lineBox(props.text_size)
  if (props.align_h === undefined) props.align_h = ui.align.LEFT
  if (props.align_v === undefined) props.align_v = ui.align.TOP
  if (props.text_style === undefined) props.text_style = ui.text_style.NONE
  if (props.text === undefined) props.text = ''
  return props
}

// props with `color` added (props: a fresh object, e.g. from the geometry helpers)
export function colored(props, color) {
  props.color = color
  return props
}

// The watch lays text out from the top of a 1.2em box (Barlow: ascent 1.0 + descent 0.2).
// cssTop converts a CSS text box from the design (top, font-size, line-height) to widget y.
export const cssTop = (top, size, lineHeight) => Math.round(top + ((lineHeight - 1.2) * size) / 2)
export const lineBox = (size) => Math.ceil(size * 1.2) + 2
