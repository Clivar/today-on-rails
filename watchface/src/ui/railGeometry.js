// The rail: a 12-hour clock around the rounded-square screen edge.
// Positions are proportional to distance along the path (like SVG pathLength=12),
// starting at 12 o'clock (top centre) and running clockwise.
// Pure geometry (no @zos imports): components/rail.js turns it into widgets; tests/watch/rail.test.mjs.
// Parts of it run on every minute refresh: plain indexed loops, no for…of, callbacks or destructuring
// (each costs about 0.1–0.2 ms on the watch, measured with tools/build.sh perf).
import { W, H } from './theme.js'

// The Bip 6 screen has rounded corners with an 86 px radius (Zepp device spec "rAngle").
// Both rings are concentric with them, so they keep the same distance from the visible
// edge all the way round. OUTER sits 13 px in: the biggest mark on it (the 16 px subject dot)
// then keeps 5 px from the edge — at 10 px the panel's edge visibly clipped it on the watch.
// INNER keeps 16 px from OUTER: the dots' black halos (12 px) stop where the ticks (8 px) start.
export const SCREEN_CORNER = 86
export const OUTER = { inset: 13, r: SCREEN_CORNER - 13 }
export const INNER = { inset: 29, r: SCREEN_CORNER - 29 }

// Line widths and mark sizes (diameters) on the outer ring. Every halo is black: it punches the
// ring and the arc around its mark.
export const RING_WIDTH = 3
export const ARC_WIDTH = 8
export const MARK = {
  subject: { d: 16, halo: 24 }, // the emphasised event (lime)
  ring: { d: 16, plain: 14, width: 4, halo: 24 }, // calendar event (plain: without emphasis)
  dot: { d: 12, halo: 20 }, // reminder
  now: { d: 12, halo: 20 },
  dim: { d: 12 }, // the event's dot on the dim screen
}

// ── How the watch draws ARC and STROKE_RECT (measured on the Bip 6, 2026-11-03) ───────────────
// Kept in one place so the rail follows the device; measured from a screenshot of the "rail" test
// build (tools/build.sh rail), against the straight runs drawn with FILL_RECT:
//   arcAngleOffset  added to our angles (ours: degrees, 0° = 3 o'clock, clockwise). The watch
//                   uses the same: 0.
//   arcStroke       'inside': an ARC's stroke lies inside its x/y/w/h box (outer edge on the box).
//                   With 'centre' the corners sat 4 px (half the line) inside the straight runs.
//   strokeRect      STROKE_RECT (the thin base ring) the same: 'inside'.
// The arcs' ends get round caps of their own (cap dots), so the ARC's own cap shape doesn't matter.
const DEG = 180 / Math.PI

export const DEVICE = { arcAngleOffset: 0, arcStroke: 'inside', strokeRect: 'inside' }

// ARC widget props for a corner piece, or null when it's under a pixel long: such a leftover of a
// span ending just past a corner is covered by the arc's round cap, and its angles could round to
// start === end, which the watch might draw as a full circle. The angles are rounded outwards, so a
// piece that is drawn never collapses (and adjoining pieces overlap by under a degree, never gap).
export function arcProps({ cx, cy, r, from, to }, lineWidth) {
  if ((r * (to - from)) / DEG < 1) return null
  const R = DEVICE.arcStroke === 'inside' ? r + lineWidth / 2 : r
  return {
    x: Math.round(cx - R), y: Math.round(cy - R), w: Math.round(2 * R), h: Math.round(2 * R),
    start_angle: Math.floor(from + DEVICE.arcAngleOffset + 1e-9),
    end_angle: Math.ceil(to + DEVICE.arcAngleOffset - 1e-9),
    line_width: lineWidth,
  }
}

// STROKE_RECT props for a whole ring
export function ringProps({ inset, r }, lineWidth) {
  const out = DEVICE.strokeRect === 'inside' ? lineWidth / 2 : 0
  const x = Math.round(inset - out), y = Math.round(inset - out)
  return {
    x, y, w: Math.round(W - inset + out) - x, h: Math.round(H - inset + out) - y,
    radius: Math.round(r + out), line_width: lineWidth,
  }
}
// ──────────────────────────────────────────────────────────────────────────────────────────────


// The path as 9 pieces — half the top, corner, right, corner, bottom, corner, left, corner, the
// other half of the top — each { len, at(d) -> [x, y, direction], piece(a, b) -> drawable piece }
function segments({ inset: m, r }) {
  const R = W - m
  const B = H - m
  const sx = W - 2 * m - 2 * r
  const sy = H - 2 * m - 2 * r
  const straight = (len, x0, y0, dx, dy) => ({
    len,
    at: (d) => [x0 + dx * d, y0 + dy * d, Math.atan2(dy, dx)],
    piece: (a, b) => ({ kind: 'line', x0: x0 + dx * a, y0: y0 + dy * a, x1: x0 + dx * b, y1: y0 + dy * b }),
  })
  const corner = (cx, cy, a0) => ({
    len: (Math.PI * r) / 2,
    at: (d) => {
      const a = a0 + d / r
      return [cx + r * Math.cos(a), cy + r * Math.sin(a), a + Math.PI / 2]
    },
    piece: (a, b) => ({ kind: 'corner', cx, cy, r, from: (a0 + a / r) * DEG, to: (a0 + b / r) * DEG }),
  })
  return [
    straight(sx / 2, W / 2, m, 1, 0),
    corner(R - r, m + r, -Math.PI / 2),
    straight(sy, R, m + r, 0, 1),
    corner(R - r, B - r, 0),
    straight(sx, R - r, B, -1, 0),
    corner(m + r, B - r, Math.PI / 2),
    straight(sy, m, B - r, 0, -1),
    corner(m + r, m + r, Math.PI),
    straight(sx / 2, m + r, m, 1, 0),
  ]
}

const cache = {}
function path(shape) {
  const key = shape.inset + ':' + shape.r
  if (!cache[key]) {
    const segs = segments(shape)
    cache[key] = { segs, length: segs.reduce((s, seg) => s + seg.len, 0) }
  }
  return cache[key]
}

const wrap12 = (h) => ((h % 12) + 12) % 12

// [x, y, direction angle] at rail hour h (0..12)
export function railPoint(h, shape = OUTER) {
  const { segs, length } = path(shape)
  let d = (wrap12(h) / 12) * length
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i].len) return segs[i].at(d)
    d -= segs[i].len
  }
  return segs[0].at(0)
}

// Length in px of one rail hour on this shape
export function hourLength(shape = OUTER) {
  return path(shape).length / 12
}

// The rail from hour h0 clockwise to h1 (h1 < h0 wraps past 12), as the path's own pieces:
//   { kind: 'line', x0, y0, x1, y1 }          a straight run (horizontal or vertical)
//   { kind: 'corner', cx, cy, r, from, to }   part of a corner circle, degrees (0 = 3 o'clock, clockwise)
// A handful of system-drawn shapes instead of hundreds of tiny segments: smooth, and cheap to update.
// Spans under half a pixel give no pieces.
export function railPieces(h0, h1, shape = OUTER) {
  const { segs, length } = path(shape)
  const span = wrap12(h1 - h0)
  const d0 = (wrap12(h0) / 12) * length
  const d1 = d0 + (span / 12) * length
  if (d1 - d0 < 0.5) return []
  const pieces = []
  let start = 0
  // Twice round, so a span past 12 o'clock carries on from the start of the path
  for (let i = 0; i < 2 * segs.length; i++) {
    const seg = segs[i % segs.length]
    const a = Math.max(d0, start) - start
    const b = Math.min(d1, start + seg.len) - start
    if (b - a > 1e-6) {
      const p = seg.piece(a, b)
      // The top's two halves meet at 12 o'clock: one run
      const q = pieces[pieces.length - 1]
      if (q && q.kind === 'line' && p.kind === 'line' && q.x1 === p.x0 && q.y1 === p.y0) q.x1 = p.x1
      else pieces.push(p)
    }
    start += seg.len
  }
  return pieces
}

// The two ends of a list of pieces: [[x, y] at the start, [x, y] at the end]
export function pieceEnds(pieces) {
  const first = pieces[0], last = pieces[pieces.length - 1]
  return [
    first.kind === 'line' ? [first.x0, first.y0] : cornerPoint(first, first.from),
    last.kind === 'line' ? [last.x1, last.y1] : cornerPoint(last, last.to),
  ]
}

// [x, y] on a corner piece at `deg` degrees
const cornerPoint = (p, deg) => [p.cx + p.r * Math.cos(deg / DEG), p.cy + p.r * Math.sin(deg / DEG)]

// The widgets that draw an arc's pieces, `width` px thick:
//   rects  round-ended FILL_RECT boxes: the straight runs, and a round cap on each end of the arc that is
//          a corner (the ARC's own ends may be square; a run's round end is a cap already)
//   arcs   ARC props for the corners (sub-pixel leftovers skipped: see arcProps)
// All in one colour, so their order doesn't matter.
export function arcShapes(pieces, width) {
  const rects = [], arcs = []
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i]
    if (p.kind === 'line') rects.push(lineBox(p, width))
    else {
      const props = arcProps(p, width)
      if (props) arcs.push(props)
    }
  }
  if (pieces.length) {
    const first = pieces[0], last = pieces[pieces.length - 1]
    if (first.kind === 'corner') rects.push(capBox(cornerPoint(first, first.from), width))
    if (last.kind === 'corner') rects.push(capBox(cornerPoint(last, last.to), width))
  }
  return { rects, arcs }
}

const capBox = (point, width) => discBox(point[0], point[1], width)

// Widget box of a straight piece drawn `width` px thick with round ends (FILL_RECT, radius = width/2)
export function lineBox({ x0, y0, x1, y1 }, width) {
  const r = width / 2
  const left = Math.round(Math.min(x0, x1) - r), top = Math.round(Math.min(y0, y1) - r)
  return {
    x: left, y: top, w: Math.round(Math.max(x0, x1) + r) - left, h: Math.round(Math.max(y0, y1) + r) - top, radius: r,
  }
}

// Widget box of a round dot of diameter d centred on (x, y) (FILL_RECT, radius = d/2: CIRCLE can't move)
export function discBox(x, y, d) {
  return { x: Math.round(x - d / 2), y: Math.round(y - d / 2), w: d, h: d, radius: d / 2 }
}

// Hour ticks on the inner ring: every hour but the numerals' (12, 3, 9)
export const TICK_HOURS = [1, 2, 4, 5, 6, 7, 8, 10, 11]
export const TICK = { along: 4, across: 8 }

// A tick's box: a short dash across the ring. All ticks sit on (or within 4° of) a straight run,
// so an axis-aligned rectangle is exact enough (tested).
export function tickBox(h) {
  const [x, y, dir] = railPoint(h, INNER)
  const horizontal = Math.abs(Math.cos(dir)) > Math.abs(Math.sin(dir))
  const w = horizontal ? TICK.along : TICK.across
  const hh = horizontal ? TICK.across : TICK.along
  return { x: Math.round(x - w / 2), y: Math.round(y - hh / 2), w, h: hh }
}

// Distance between two rail hours, going round the clock
export const hoursApart = (a, b) => Math.min(Math.abs(a - b), 12 - Math.abs(a - b))

// The lime arc runs to the rail's target — the end of an ongoing event, else the start of the next
// one — only once that is at most `minutes` away (phone setting "rail"): a long-lit arc costs battery.
export function arcInWindow(subject, minutes) {
  if (!subject) return false
  const away = subject.ongoing ? subject.endInMin : subject.inMin
  return away >= 0 && away <= minutes
}

// Where a time label for rail hour h goes: on the inner ring, pulled towards the centre (just clear
// of the edge at the top and bottom, further in on the sides where the labels are wider than tall).
// Returns null if the label's box would cover one of the `avoid` boxes [x0, y0, x1, y1].
export function labelSpot(h, width, avoid = []) {
  const point = railPoint(h, INNER)
  const px = point[0], py = point[1]
  const dx = W / 2 - px, dy = H / 2 - py, len = Math.sqrt(dx * dx + dy * dy) || 1
  const k = Math.abs(dy) > Math.abs(dx) ? 6 : 16
  const x = px + (dx / len) * k, y = py + (dy / len) * k
  for (let i = 0; i < avoid.length; i++) {
    const box = avoid[i] // [x0, y0, x1, y1]
    if (x - width / 2 < box[2] && x + width / 2 > box[0] && y - 10 < box[3] && y + 10 > box[1]) return null
  }
  return { x, y }
}

// The numerals on the inner ring: [rail hour, text]
export const NUMERALS = [[0, '12'], [3, '3'], [9, '9']]
