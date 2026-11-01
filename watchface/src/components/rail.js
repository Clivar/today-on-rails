// The rail (screen on): a 12-hour clock around the screen edge, drawn on a canvas.
//   outer ring — thin line, item dots (reminder = filled, calendar = ring), white "now" dot;
//                with emphasis: a lime arc from now to the event. While an event is on, its whole
//                span shows: the elapsed part dim, what's left bright — time you can see.
//   inner ring — hour ticks, numerals 12 / 3 / 9, and the event's time label (replacing a numeral
//                it would cover; left out if it would cover content).
// The always-on rail is components/alwaysOnRail.js (a flagged canvas can't draw while dimmed).
import ui from '@zos/ui'

import { W, H, C, F } from '../ui/theme.js'
import { widget, text, setProps, setVisible } from '../ui/widgets.js'
import { textWidth } from '../ui/text.js'
import { railPoint, railPolyline, hourLength, labelSpot, hoursApart, NUMERALS, INNER, OUTER } from '../ui/railGeometry.js'
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
  const canvas = widget(ui.widget.CANVAS, { x: 0, y: 0, w: W, h: H })
  const numerals = NUMERALS.map(([h, s]) => numeral(h, s, C.numeral))
  const label = text({
    x: 0, y: 0, w: 80, h: 20, text_size: 16, font: F.bold, color: C.muted,
    align_h: ui.align.CENTER_H, align_v: ui.align.CENTER_V,
  })

  // state:    { now, is24, agenda, subject }
  // emphasis: lime arc and dot for the subject
  // avoid:    screen boxes the time label must not cover (AVOID.clock / AVOID.card)
  function render(state, { emphasis, avoid }) {
    const { subject } = state
    const nowH = railHour(state.now.hours, state.now.minutes)
    const target = railTarget(subject)
    const labelText = target ? formatTime(target.hours, target.minutes, state.is24, false) : ''
    const labelW = textWidth(labelText, 'bold', 16) + 8
    const spot = target && labelSpot(target.h, labelW, avoid)

    canvas.clear({ x: 0, y: 0, w: W, h: H })
    polyline(canvas, railPolyline(0, 11.999, OUTER, 8), C.line, 3)
    drawTicks(canvas, spot ? target.h : null)
    if (emphasis && target) {
      if (subject.ongoing) polyline(canvas, railPolyline(railHour(subject.hours, subject.minutes), nowH, OUTER, 4), ELAPSED, 8)
      polyline(canvas, railPolyline(nowH, target.h, OUTER, 4), C.lime, 8)
    }
    drawItems(canvas, state.agenda.items.filter((it) => it !== subject && startsOnRail(it)), emphasis)
    if (target) drawSubject(canvas, subject, target.h, emphasis)
    dot(canvas, nowH, 5.5, C.text, 10)

    NUMERALS.forEach(([h], i) => setVisible(numerals[i], !spot || hoursApart(h, target.h) >= 0.75))
    setVisible(label, !!spot)
    if (spot) {
      canvas.drawRect({ x: spot.x - labelW / 2, y: spot.y - 10, w: labelW, h: 20, color: C.bg })
      setProps(label, {
        x: Math.round(spot.x - 40), y: Math.round(spot.y - 10), w: 80, h: 20, text: labelText,
        color: emphasis ? C.lime : C.muted,
      })
    }
  }

  return { render }
}

// A numeral (12 / 3 / 9) on the inner ring; also used by the always-on rail
export function numeral(h, s, color) {
  const [x, y] = railPoint(h, INNER)
  return text({
    x: Math.round(x - 20), y: Math.round(y - 10), w: 40, h: 20, text: s, text_size: 15, font: F.bold,
    color, align_h: ui.align.CENTER_H, align_v: ui.align.CENTER_V,
  })
}

function drawTicks(canvas, labelH) {
  // Short 8px-wide dashes on the inner ring, skipping the numerals and the label
  const dash = 1.75 / hourLength(INNER)
  for (let k = 0; k < 12; k++) {
    if (k % 3 === 0 && k !== 6) continue
    if (labelH !== null && hoursApart(k, labelH) < 0.45) continue
    const [x1, y1] = railPoint(k - dash, INNER)
    const [x2, y2] = railPoint(k + dash, INNER)
    line(canvas, x1, y1, x2, y2, C.tick, 8)
  }
}

function drawItems(canvas, items, emphasis) {
  // Later items first, so earlier ones end up on top
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]
    const h = railHour(it.hours, it.minutes)
    if (it.kind === 'calendar') ring(canvas, h, emphasis ? 8 : 7.5, 4, emphasis ? C.text : C.muted, 12)
    else dot(canvas, h, emphasis ? 6.5 : 6, C.muted, 10)
  }
}

function drawSubject(canvas, subject, h, emphasis) {
  if (emphasis) dot(canvas, h, 9, C.lime, 12)
  else if (subject.kind === 'calendar') ring(canvas, h, 7.5, 4, C.muted, 12)
  else dot(canvas, h, 6, C.muted, 10)
}

// ── Canvas primitives ──────────────────────────────────────────────────────────

// The watch ignores drawLine's own color/line_width and uses the current paint
function line(canvas, x1, y1, x2, y2, color, width) {
  canvas.setPaint({ color, line_width: width })
  canvas.drawLine({ x1, y1, x2, y2, color, line_width: width })
}

function polyline(canvas, pts, color, width) {
  canvas.setPaint({ color, line_width: width })
  for (let i = 1; i < pts.length; i++) {
    canvas.drawLine({ x1: pts[i - 1][0], y1: pts[i - 1][1], x2: pts[i][0], y2: pts[i][1], color, line_width: width })
  }
  // Round joints and caps keep thick lines smooth through the corners
  if (width > 3) {
    for (const p of pts) canvas.drawCircle({ center_x: p[0], center_y: p[1], radius: width / 2, color })
  }
}

function dot(canvas, h, r, color, halo = 0) {
  const [x, y] = railPoint(h, OUTER)
  if (halo) canvas.drawCircle({ center_x: x, center_y: y, radius: halo, color: C.bg })
  canvas.drawCircle({ center_x: x, center_y: y, radius: r, color })
}

function ring(canvas, h, r, width, color, halo) {
  const [x, y] = railPoint(h, OUTER)
  canvas.drawCircle({ center_x: x, center_y: y, radius: halo, color: C.bg })
  canvas.drawCircle({ center_x: x, center_y: y, radius: r, color })
  canvas.drawCircle({ center_x: x, center_y: y, radius: Math.max(1, r - width), color: C.bg })
}
