// The rail (screen on): a 12-hour clock around the screen edge.
//   outer ring — thin line, item dots (reminder = filled, calendar = ring), white "now" dot;
//                with emphasis: a lime arc from now to the event, once that is at most the phone's
//                "rail" minutes away. While an event is on, its whole span shows: the elapsed part
//                dim, what's left bright — time you can see.
//   inner ring — hour ticks, numerals 12 / 3 / 9, and the event's time label (replacing a numeral
//                it would cover; left out if it would cover content).
// Made of system widgets, not a canvas: they're drawn smooth (antialiased), and the minute refresh
// only moves the few that changed. Widgets stack in creation order, so they're created bottom to top.
// The always-on rail is components/alwaysOnRail.js (a flagged canvas can't draw while dimmed).
import ui from '@zos/ui'

import { C, F } from '../ui/theme.js'
import { widget, text, setProps, setVisible } from '../ui/widgets.js'
import { textWidth } from '../ui/text.js'
import {
  railPoint, railPieces, pieceEnds, lineBox, discBox, arcProps, ringProps, tickBox, arcInWindow, labelSpot, hoursApart,
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

export function createRail() {
  shape(ui.widget.STROKE_RECT, { ...ringProps(OUTER, RING_WIDTH), color: C.line })
  const ticks = TICK_HOURS.map((h) => shape(ui.widget.FILL_RECT, { ...tickBox(h), color: C.tick }))
  const numerals = NUMERALS.map(([h, s]) => tracked(numeral(h, s, C.numeral)))
  const elapsed = createArc(ELAPSED)
  const lime = createArc(C.lime)
  // Dots, in a pool that grows when an agenda needs more. Each render hands them out bottom to top,
  // so new ones (created on top) keep the order right. The label must stay above them: when the
  // pool grows (rarely: the face is rebuilt on every wake), a new label is made on top.
  const marks = []
  for (let i = 0; i < 4; i++) marks.push(createMark())
  let label = createLabel()

  // state:    { now, is24, agenda, subject }
  // emphasis: lime arc and dot for the subject
  // avoid:    screen boxes the time label must not cover (AVOID.clock / AVOID.card)
  function render(state, { emphasis, avoid }) {
    const { subject } = state
    const nowH = railHour(state.now.hours, state.now.minutes)
    const target = railTarget(subject)
    const labelText = target ? formatTime(target.hours, target.minutes, state.is24, false) : ''
    const spot = target && labelSpot(target.h, textWidth(labelText, 'bold', 16) + 8, avoid)

    TICK_HOURS.forEach((h, i) => ticks[i].show(!spot || hoursApart(h, target.h) >= 0.45))
    NUMERALS.forEach(([h], i) => numerals[i].show(!spot || hoursApart(h, target.h) >= 0.75))

    const arc = emphasis && target && arcInWindow(subject, state.agenda.settings.rail)
    elapsed.draw(arc && subject.ongoing ? railPieces(railHour(subject.hours, subject.minutes), nowH) : [])
    lime.draw(arc ? railPieces(nowH, target.h) : [])

    // Bottom to top: later items first (so earlier ones end up on top), the subject, now
    const list = []
    const items = state.agenda.items.filter((it) => it !== subject && startsOnRail(it))
    for (let i = items.length - 1; i >= 0; i--) {
      list.push(itemMark(items[i], railHour(items[i].hours, items[i].minutes), emphasis))
    }
    if (target) list.push(emphasis ? { h: target.h, ...MARK.subject, color: C.lime } : itemMark(subject, target.h, false))
    list.push({ h: nowH, ...MARK.now, color: C.text })
    if (marks.length < list.length) {
      while (marks.length < list.length) marks.push(createMark())
      label.show(false)
      label = createLabel()
    }
    marks.forEach((m, i) => m.draw(list[i]))

    label.show(!!spot)
    if (spot) {
      label.set({
        x: Math.round(spot.x - 40), y: Math.round(spot.y - 10), w: 80, h: 20, text: labelText,
        color: emphasis ? C.lime : C.muted,
      })
    }
  }

  return { render }
}

function createLabel() {
  return tracked(text({
    x: 0, y: 0, w: 80, h: 20, text_size: 16, font: F.bold, color: C.muted,
    align_h: ui.align.CENTER_H, align_v: ui.align.CENTER_V,
  }))
}

// A numeral (12 / 3 / 9) on the inner ring; also used by the always-on rail
export function numeral(h, s, color) {
  const [x, y] = railPoint(h, INNER)
  return text({
    x: Math.round(x - 20), y: Math.round(y - 10), w: 40, h: 20, text: s, text_size: 15, font: F.bold,
    color, align_h: ui.align.CENTER_H, align_v: ui.align.CENTER_V,
  })
}

function itemMark(it, h, emphasis) {
  if (it.kind === 'calendar') {
    const d = emphasis ? MARK.ring.d : MARK.ring.dim
    return { h, d, hole: d - 2 * MARK.ring.width, halo: MARK.ring.halo, color: emphasis ? C.text : C.muted }
  }
  return { h, ...MARK.dot, color: C.muted }
}

// An arc on the outer ring: straight runs (round-ended FILL_RECTs), corner pieces (ARCs) and a
// round cap at each end (the ARC's own ends may be square). A span under 12 hours has at most
// 5 of each kind (tested), so they're all created up front, under the dots.
function createArc(color) {
  const lines = [], corners = []
  for (let i = 0; i < 5; i++) {
    lines.push(shape(ui.widget.FILL_RECT, { x: 0, y: 0, w: ARC_WIDTH, h: ARC_WIDTH, radius: ARC_WIDTH / 2, color }))
    corners.push(shape(ui.widget.ARC, { x: 0, y: 0, w: 2, h: 2, start_angle: 0, end_angle: 0, line_width: ARC_WIDTH, color }))
  }
  const caps = [0, 1].map(() => shape(ui.widget.FILL_RECT, { ...discBox(0, 0, ARC_WIDTH), color }))

  function draw(pieces) {
    let l = 0, c = 0
    for (const p of pieces) {
      if (p.kind === 'line') lines[l++].place(lineBox(p, ARC_WIDTH))
      else {
        const props = arcProps(p, ARC_WIDTH)
        if (props) corners[c++].place(props)
      }
    }
    lines.forEach((w, i) => i >= l && w.show(false))
    corners.forEach((w, i) => i >= c && w.show(false))
    if (!pieces.length) return caps.forEach((w) => w.show(false))
    pieceEnds(pieces).forEach(([x, y], i) => caps[i].place(discBox(x, y, ARC_WIDTH)))
  }

  return { draw }
}

// A dot on the outer ring: black halo, the dot, and a black hole when it's a ring
function createMark() {
  const halo = shape(ui.widget.FILL_RECT, { ...discBox(0, 0, 2), color: C.bg })
  const disc = shape(ui.widget.FILL_RECT, { ...discBox(0, 0, 2), color: C.bg })
  const hole = shape(ui.widget.FILL_RECT, { ...discBox(0, 0, 2), color: C.bg })

  function draw(m) {
    if (!m) return [halo, disc, hole].forEach((w) => w.show(false))
    const [x, y] = railPoint(m.h, OUTER)
    halo.place(discBox(x, y, m.halo))
    disc.place({ ...discBox(x, y, m.d), color: m.color })
    if (m.hole) hole.place(discBox(x, y, m.hole))
    else hole.show(false)
  }

  return { draw }
}

// ── Widgets that only talk to the watch when something changed ──────────────────────────────────
// The minute refresh then costs a few calls (the now dot, the arc's ends) instead of redrawing it all.

function shape(type, props) {
  return tracked(widget(type, props), props)
}

// place(props): show it there; set(props): change props (visibility as it is); show(on)
export function tracked(w, initial = {}) {
  let last = initial
  let shown = true
  const set = (props) => {
    if (Object.keys(props).some((k) => props[k] !== last[k])) {
      setProps(w, props)
      last = { ...last, ...props }
    }
  }
  const show = (on) => {
    if (on !== shown) setVisible(w, on)
    shown = on
  }
  return { set, show, place: (props) => (set(props), show(true)) }
}
