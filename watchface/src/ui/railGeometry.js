// The rail: a 12-hour clock around the rounded-square screen edge.
// Positions are proportional to distance along the path (like SVG pathLength=12),
// starting at 12 o'clock (top centre) and running clockwise.
import { W, H } from './theme.js'

// The Bip 6 screen has rounded corners with an 86 px radius (Zepp device spec "rAngle").
// Both rings are concentric with them, so they keep the same distance from the visible
// edge all the way round (the design's 54 px radius ran off-screen in the corners).
export const SCREEN_CORNER = 86
export const OUTER = { inset: 10, r: SCREEN_CORNER - 10 }
export const INNER = { inset: 26, r: SCREEN_CORNER - 26 }

function segments({ inset: m, r }) {
  const R = W - m
  const B = H - m
  const sx = W - 2 * m - 2 * r
  const sy = H - 2 * m - 2 * r
  const q = (Math.PI * r) / 2
  const arc = (cx, cy, a0) => (d) => {
    const a = a0 + d / r
    return [cx + r * Math.cos(a), cy + r * Math.sin(a), a + Math.PI / 2]
  }
  // [length, point(d) -> [x, y, direction angle]]
  return [
    [sx / 2, (d) => [W / 2 + d, m, 0]],
    [q, arc(R - r, m + r, -Math.PI / 2)],
    [sy, (d) => [R, m + r + d, Math.PI / 2]],
    [q, arc(R - r, B - r, 0)],
    [sx, (d) => [R - r - d, B, Math.PI]],
    [q, arc(m + r, B - r, Math.PI / 2)],
    [sy, (d) => [m, B - r - d, -Math.PI / 2]],
    [q, arc(m + r, m + r, Math.PI)],
    [sx / 2, (d) => [m + r + d, m, 0]],
  ]
}

const cache = {}
function path(shape) {
  const key = shape.inset + ':' + shape.r
  if (!cache[key]) {
    const segs = segments(shape)
    cache[key] = { segs, length: segs.reduce((s, [len]) => s + len, 0) }
  }
  return cache[key]
}

// [x, y, angle] at rail hour h (0..12)
export function railPoint(h, shape = OUTER) {
  const { segs, length } = path(shape)
  let d = ((((h % 12) + 12) % 12) / 12) * length
  for (const [len, at] of segs) {
    if (d <= len) return at(d)
    d -= len
  }
  return segs[0][1](0)
}

// Points every ~step px from hour h0 to h1 (clockwise; h1 may be < h0 to wrap)
export function railPolyline(h0, h1, shape = OUTER, step = 6) {
  const { length } = path(shape)
  let span = h1 - h0
  if (span < 0) span += 12
  const n = Math.max(1, Math.ceil(((span / 12) * length) / step))
  const pts = []
  for (let i = 0; i <= n; i++) pts.push(railPoint(h0 + (span * i) / n, shape))
  return pts
}

// Length in px of one rail hour on this shape
export function hourLength(shape = OUTER) {
  return path(shape).length / 12
}

// Distance between two rail hours, going round the clock
export const hoursApart = (a, b) => Math.min(Math.abs(a - b), 12 - Math.abs(a - b))

// Where a time label for rail hour h goes: on the inner ring, pulled towards the centre (just clear
// of the edge at the top and bottom, further in on the sides where the labels are wider than tall).
// Returns null if the label's box would cover one of the `avoid` boxes [x0, y0, x1, y1].
export function labelSpot(h, width, avoid = []) {
  const [px, py] = railPoint(h, INNER)
  const dx = W / 2 - px, dy = H / 2 - py, len = Math.sqrt(dx * dx + dy * dy) || 1
  const k = Math.abs(dy) > Math.abs(dx) ? 6 : 16
  const x = px + (dx / len) * k, y = py + (dy / len) * k
  const covers = avoid.some(([a, b, c, d]) => x - width / 2 < c && x + width / 2 > a && y - 10 < d && y + 10 > b)
  return covers ? null : { x, y }
}

// The numerals on the inner ring: [rail hour, text]
export const NUMERALS = [[0, '12'], [3, '3'], [9, '9']]
