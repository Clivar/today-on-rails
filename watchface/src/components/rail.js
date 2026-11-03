// The rail (screen on): a 12-hour clock around the screen edge.
//   outer ring — thin line, item dots (reminder = filled, calendar = ring), white "now" dot;
//                with emphasis: a lime arc from now to the event, once that is at most the phone's
//                "rail" minutes away. While an event is on, its whole span shows: the elapsed part
//                dim, what's left bright — time you can see.
//   inner ring — hour ticks, numerals 12 / 3 / 9, and the event's time label (replacing a numeral
//                it would cover; left out if it would cover content).
// Made of system widgets, not a canvas: they're drawn smooth (antialiased), and the minute refresh
// only moves the few that changed (tracked widgets, ui/widgets.js). The always-on rail is
// components/alwaysOnRail.js (a flagged canvas can't draw while dimmed).
//
// Widgets stack in creation order, bottom to top: base ring, ticks, numerals (created with the rail),
// then the elapsed arc, the lime arc, the dots and the label. Those four layers are pools created on
// demand, with their first props, by the first render (part of the build), in that order: a face
// that shows no arc creates no arc widgets. A layer that has to grow later would put its new widgets
// on top of the layers above it, so these start over above it: their widgets are hidden and new ones
// created (see stack). That's rare: the face is rebuilt on every wake, so a pool only grows when a
// lit screen sees the minute change and the arc reaches a new corner or an item comes onto the rail.
// Nothing else the face draws reaches the outer ring (content keeps 36 px from the edge, see AVOID),
// so the pools lying above the rest of the face changes nothing.
import ui from '@zos/ui'

import { C, F } from '../ui/theme.js'
import { widget, trackedWidget, trackedText, colored, withWidgetLevel } from '../ui/widgets.js'
import { textWidth } from '../ui/text.js'
import {
  railPoint, railPieces, arcShapes, discBox, ringProps, tickBox, arcInWindow, labelSpot, hoursApart,
  NUMERALS, TICK_HOURS, INNER, OUTER, ARC_WIDTH, RING_WIDTH, MARK,
} from '../ui/railGeometry.js'
import { railHour, railTarget, startsOnRail, formatTime } from '../data/agenda.js'

// Screen boxes the time label must not cover, per layout
export const AVOID = {
  // date row, complications row, record button
  clock: [[36, 36, 356, 68], [36, 358, 288, 402], [290, 346, 360, 414]],
  // Today card: small clock, the event block, the list, record button
  card: [[36, 36, 160, 76], [36, 110, 356, 300], [36, 326, 288, 392], [290, 346, 360, 414]],
}

const ELAPSED = 0x4a6b22 // dim lime: the part of an ongoing event that's behind you
const NONE = []

// The rail's per-minute work runs on the watch's slow JS: indexed loops, no for…of, callbacks or
// destructuring per mark (each costs about 0.1–0.2 ms there; tools/build.sh perf).
export function createRail() {
  widget(ui.widget.STROKE_RECT, colored(ringProps(OUTER, RING_WIDTH), C.line))
  const ticks = TICK_HOURS.map((h) => trackedWidget(ui.widget.FILL_RECT, colored(tickBox(h), C.tick)))
  const numerals = NUMERALS.map((n) => numeral(n[0], n[1], C.numeral))
  const elapsed = arcLayer(ELAPSED)
  const lime = arcLayer(C.lime)
  const marks = pool('normal', createMark)
  const label = pool('normal', timeLabel)

  // state:    { now, is24, agenda, subject }
  // emphasis: lime arc and dot for the subject
  // avoid:    screen boxes the time label must not cover (AVOID.clock / AVOID.card)
  function render(state, options) {
    const subject = state.subject
    const emphasis = options.emphasis
    const nowH = railHour(state.now.hours, state.now.minutes)
    const target = railTarget(subject)
    const labelText = target ? formatTime(target.hours, target.minutes, state.is24, false) : ''
    const spot = target && labelSpot(target.h, textWidth(labelText, 'bold', 16) + 8, options.avoid)

    for (let i = 0; i < TICK_HOURS.length; i++) ticks[i].show(!spot || hoursApart(TICK_HOURS[i], target.h) >= 0.45)
    for (let i = 0; i < NUMERALS.length; i++) numerals[i].show(!spot || hoursApart(NUMERALS[i][0], target.h) >= 0.75)

    const arc = emphasis && target && arcInWindow(subject, state.agenda.settings.rail)

    // Dots bottom to top: later items first (so earlier ones end up on top), the subject, now
    const list = []
    const items = state.agenda.items
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i]
      if (it !== subject && startsOnRail(it)) list.push(itemMark(it, railHour(it.hours, it.minutes), emphasis))
    }
    if (target) list.push(emphasis ? mark(target.h, MARK.subject, C.lime) : itemMark(subject, target.h, false))
    list.push(mark(nowH, MARK.now, C.text))

    // The layers bottom to top (see the top of the file): once one creates widgets, those above restack
    let restack = elapsed(arc && subject.ongoing ? railPieces(railHour(subject.hours, subject.minutes), nowH) : NONE, false)
    restack = lime(arc ? railPieces(nowH, target.h) : NONE, restack) || restack
    restack = marks(list, restack) || restack
    label(spot ? [labelProps(spot, labelText, emphasis ? C.lime : C.muted)] : NONE, restack)
  }

  return { render }
}

// ── Pools: widgets created when first needed ─────────────────────────────────────────────────────

// A pool of like widgets at a level ('normal' | 'alwaysOn'): create(item) makes one, already showing
// item, and returns its draw(item), which shows it with item's props or hides it when item is null.
// → draw(items, restack): one widget per item, the rest hidden, more created when needed. restack:
// hide them all and start over (on top of what was created since). Returns whether it created any.
export function pool(level, create) {
  let units = []
  const grow = (items) => () => {
    for (let i = units.length; i < items.length; i++) units.push(create(items[i]))
  }
  return (items, restack) => {
    if (restack) {
      for (let i = 0; i < units.length; i++) units[i](null)
      units = []
    }
    for (let i = 0; i < units.length; i++) units[i](i < items.length ? items[i] : null)
    if (items.length <= units.length) return false
    withWidgetLevel(level, grow(items)) // created while drawing, outside the set's own level
    return true
  }
}

// A pool's widget: a shape of one colour, created with its first props (no extra call to place it)
export function piece(type, props, color) {
  const w = trackedWidget(type, colored(props, color))
  return (next) => (next ? w.place(next) : w.show(false))
}

// An arc on the outer ring, as a layer: straight runs and round caps (FILL_RECTs), corners (ARCs).
// All one colour, so the two pools' order doesn't matter. draw(pieces, restack) like a pool's.
function arcLayer(color) {
  const rects = pool('normal', (box) => piece(ui.widget.FILL_RECT, box, color))
  const corners = pool('normal', (props) => piece(ui.widget.ARC, props, color))
  return (pieces, restack) => {
    const shapes = arcShapes(pieces, ARC_WIDTH)
    const grewRects = rects(shapes.rects, restack)
    return corners(shapes.arcs, restack) || grewRects
  }
}

// The event's time label; props from labelProps (the rest filled in here)
export function timeLabel(props) {
  props.text_size = 16
  props.font = F.bold
  props.align_h = ui.align.CENTER_H
  props.align_v = ui.align.CENTER_V
  const w = trackedText(props)
  return (next) => (next ? w.place(next) : w.show(false))
}

// Where the label goes (spot from labelSpot) and what it says
export function labelProps(spot, s, color) {
  return { x: Math.round(spot.x - 40), y: Math.round(spot.y - 10), w: 80, h: 20, text: s, color }
}

// A numeral (12 / 3 / 9) on the inner ring, tracked; also used by the always-on rail
export function numeral(h, s, color) {
  const p = railPoint(h, INNER)
  return trackedText({
    x: Math.round(p[0] - 20), y: Math.round(p[1] - 10), w: 40, h: 20, text: s, text_size: 15, font: F.bold,
    color, align_h: ui.align.CENTER_H, align_v: ui.align.CENTER_V,
  })
}

// A mark at rail hour h: centre (x, y), diameter d, black halo, colour, and a black hole for a ring
function itemMark(it, h, emphasis) {
  if (it.kind === 'calendar') {
    const d = emphasis ? MARK.ring.d : MARK.ring.dim
    const m = mark(h, MARK.ring, emphasis ? C.text : C.muted)
    m.d = d
    m.hole = d - 2 * MARK.ring.width
    return m
  }
  return mark(h, MARK.dot, C.muted)
}

// A plain dot at rail hour h: size and halo from MARK
function mark(h, size, color) {
  const p = railPoint(h, OUTER)
  return { x: p[0], y: p[1], d: size.d, halo: size.halo, hole: 0, color }
}

// A dot on the outer ring: black halo, the dot, and a black hole when it's a ring (always made, so a
// later ring in this pool's place keeps its hole under the marks above it)
function createMark(m) {
  const halo = trackedWidget(ui.widget.FILL_RECT, colored(discBox(m.x, m.y, m.halo), C.bg))
  const disc = trackedWidget(ui.widget.FILL_RECT, colored(discBox(m.x, m.y, m.d), m.color))
  const hole = trackedWidget(ui.widget.FILL_RECT, colored(discBox(m.x, m.y, m.hole || 2), C.bg))
  if (!m.hole) hole.show(false)

  return (next) => {
    if (!next) {
      halo.show(false)
      disc.show(false)
      hole.show(false)
      return
    }
    halo.place(discBox(next.x, next.y, next.halo))
    disc.place(colored(discBox(next.x, next.y, next.d), next.color))
    if (next.hole) hole.place(discBox(next.x, next.y, next.hole))
    else hole.show(false)
  }
}
