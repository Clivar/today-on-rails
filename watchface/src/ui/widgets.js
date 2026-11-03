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

// No object spread ({ ...props }) in the face: on the watch each one costs about 4 ms (measured with
// tools/build.sh perf; Object.assign about 0.5 ms), and a build creates over a hundred widgets. The
// helpers fill in the fresh props object the caller just made instead of copying it.
export function widget(type, props) {
  props.show_level = level === 'alwaysOn' ? ui.show_level.ONAL_AOD : ui.show_level.ONLY_NORMAL
  return ui.createWidget(type, props)
}

// The watch lays text out from the top of a 1.2em box (Barlow: ascent 1.0 + descent 0.2).
// cssTop converts a CSS text box from the design (top, font-size, line-height) to widget y.
export const cssTop = (top, size, lineHeight) => Math.round(top + ((lineHeight - 1.2) * size) / 2)
export const lineBox = (size) => Math.ceil(size * 1.2) + 2

// A TEXT widget; what props leaves out: full width, one line high, top left, no wrapping, empty
export function text(props) {
  if (props.w === undefined) props.w = W
  if (props.h === undefined) props.h = lineBox(props.text_size)
  if (props.align_h === undefined) props.align_h = ui.align.LEFT
  if (props.align_v === undefined) props.align_v = ui.align.TOP
  if (props.text_style === undefined) props.text_style = ui.text_style.NONE
  if (props.text === undefined) props.text = ''
  return widget(ui.widget.TEXT, props)
}

// props with `color` added (props: a fresh object, e.g. from the geometry helpers)
export function colored(props, color) {
  props.color = color
  return props
}

// Plain writes, for a widget written once in a while (the error text in watchface/index.js)
export const setText = (w, s) => w.setProperty(ui.prop.TEXT, s)
export const setVisible = (w, on) => w.setProperty(ui.prop.VISIBLE, !!on)

// ── Widgets that only talk to the watch when something changes ───────────────────────────────────
// Every setProperty is a slow call into the system, and the minute refresh sets about everything the
// face shows while only the time changed. A tracked widget remembers the props it was made with (the
// object filled in by widget()/text(), kept, not copied) and every write since, and skips a write
// that changes nothing. All writes to it must go through it, so what it remembers stays true.
// Widgets the system draws (IMG_TIME, the temperature's TEXT_IMG) change their own content: only what
// we write (place, visibility) is remembered, never what they show.
// A class, not closures: one object per widget, no functions made per widget.
class Tracked {
  constructor(w, props) {
    this.w = w
    this.last = props // what the watch has: the creation props, updated by every write
    this.shown = true // new widgets show
  }

  // Changes props (all of them in one call, as given), if any differs; visibility as it is
  set(props) {
    const last = this.last
    for (const k in props) {
      if (props[k] !== last[k]) {
        this.w.setProperty(ui.prop.MORE, props)
        for (const j in props) last[j] = props[j]
        return
      }
    }
  }

  setText(s) {
    if (s === this.last.text) return
    this.w.setProperty(ui.prop.TEXT, s)
    this.last.text = s
  }

  show(on) {
    on = !!on
    if (on === this.shown) return
    this.w.setProperty(ui.prop.VISIBLE, on)
    this.shown = on
  }

  // Shows it with these props
  place(props) {
    this.set(props)
    this.show(true)
  }
}

// w: a widget made with props (by widget() or text()), which the handle keeps
export const tracked = (w, props) => new Tracked(w, props)
export const trackedWidget = (type, props) => new Tracked(widget(type, props), props)
export const trackedText = (props) => new Tracked(text(props), props)

export function showAll(list, on) {
  for (let i = 0; i < list.length; i++) list[i].show(on)
}
