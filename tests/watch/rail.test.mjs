// The rail's geometry (watchface/src/ui/railGeometry.js): the arc as a few smooth pieces, every mark
// well inside the visible screen (its edge clipped dots on the watch), and the arc's time window.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { W, H } from '../../watchface/src/ui/theme.js'
import {
  railPoint, railPieces, pieceEnds, lineBox, discBox, arcProps, ringProps, tickBox, hourLength, arcInWindow,
  SCREEN_CORNER, OUTER, INNER, TICK_HOURS, NUMERALS, MARK, ARC_WIDTH, RING_WIDTH, DEVICE,
} from '../../watchface/src/ui/railGeometry.js'

const MARGIN = 4 // px every visible shape keeps from the screen's edge
const MINUTES = Array.from({ length: 720 }, (_, i) => i / 60) // every minute round the rail
const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps

// Distance from (x, y) to the visible screen edge (390 x 450, 86 px corners); negative outside
function inside(x, y) {
  const qx = Math.abs(x - W / 2) - (W / 2 - SCREEN_CORNER)
  const qy = Math.abs(y - H / 2) - (H / 2 - SCREEN_CORNER)
  return SCREEN_CORNER - Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - Math.min(Math.max(qx, qy), 0)
}

// The worst distance from the edge of a round-ended FILL_RECT (dot or straight arc run)
function roundRectInside({ x, y, w, h }) {
  const r = Math.min(w, h) / 2
  let worst = Infinity
  for (let t = 0; t <= 1; t += 1 / 64) {
    const cx = w >= h ? x + r + t * (w - 2 * r) : x + r
    const cy = w >= h ? y + r : y + r + t * (h - 2 * r)
    worst = Math.min(worst, inside(cx, cy) - r)
  }
  return worst
}

const length = (p) => (p.kind === 'line' ? Math.abs(p.x1 - p.x0) + Math.abs(p.y1 - p.y0) : (p.r * (p.to - p.from) * Math.PI) / 180)

// Spans that start every 10 minutes round the rail, from a minute to almost 12 hours long
const SPANS = []
for (let h0 = 0; h0 < 12; h0 += 1 / 6) for (const span of [1 / 60, 0.25, 1, 2.5, 4, 6, 9, 11.98]) SPANS.push([h0, h0 + span])

test('arc pieces join exactly, run from h0 to h1 and add up to the span', () => {
  for (const [h0, h1] of SPANS) {
    const pieces = railPieces(h0, h1 % 12)
    const [start, end] = pieceEnds(pieces)
    assert.ok(close(start[0], railPoint(h0)[0]) && close(start[1], railPoint(h0)[1]), `${h0}→${h1}: starts at ${start}`)
    assert.ok(close(end[0], railPoint(h1)[0]) && close(end[1], railPoint(h1)[1]), `${h0}→${h1}: ends at ${end}`)
    for (let i = 1; i < pieces.length; i++) {
      const a = pieceEnds([pieces[i - 1]])[1], b = pieceEnds([pieces[i]])[0]
      assert.ok(close(a[0], b[0]) && close(a[1], b[1]), `${h0}→${h1}: gap between pieces ${i - 1} and ${i}`)
    }
    const total = pieces.reduce((s, p) => s + length(p), 0)
    assert.ok(close(total, (h1 - h0) * hourLength(OUTER), 1e-6), `${h0}→${h1}: ${total} px`)
  }
})

test('arc pieces: straight runs are level or upright, corners turn clockwise within their quarter', () => {
  for (const [h0, h1] of SPANS) {
    for (const p of railPieces(h0, h1 % 12)) {
      if (p.kind === 'line') assert.ok(p.x0 === p.x1 || p.y0 === p.y1, 'slanted run')
      else {
        assert.ok(p.from < p.to, `corner ${p.from}→${p.to}`)
        const quarter = Math.floor((p.from + 1e-9) / 90) * 90 // -90 top right, 0, 90, 180 top left
        assert.ok(p.to <= quarter + 90 + 1e-9 && p.r === OUTER.r, `corner ${p.from}→${p.to} leaves its quarter`)
      }
    }
  }
})

test('a span under 12 hours needs at most 5 runs and 5 corners (the widgets created for an arc)', () => {
  for (const [h0, h1] of SPANS) {
    const pieces = railPieces(h0, h1 % 12)
    assert.ok(pieces.filter((p) => p.kind === 'line').length <= 5, `${h0}→${h1}`)
    assert.ok(pieces.filter((p) => p.kind === 'corner').length <= 5, `${h0}→${h1}`)
  }
})

test('an arc past 12 o\'clock wraps round: the top run is one piece', () => {
  const pieces = railPieces(11.5, 0.5)
  assert.equal(pieces.length, 1)
  assert.equal(pieces[0].kind, 'line')
  assert.ok(pieces[0].x0 < W / 2 && pieces[0].x1 > W / 2)
  assert.ok(close(length(pieces[0]), hourLength(OUTER)))
  // From the left side round to the right side: through the two top corners
  assert.deepEqual(railPieces(10, 2).map((p) => p.kind), ['line', 'corner', 'line', 'corner', 'line'])
})

test('empty and tiny spans draw nothing', () => {
  assert.deepEqual(railPieces(3, 3), [])
  assert.deepEqual(railPieces(7.25, 7.25 + 0.002), []) // a quarter of a pixel
  assert.equal(railPieces(7.25, 7.25 + 1 / 60).length, 1) // one minute (2 px) does
})

test('every dot, ring and cap stays 4 px inside the screen, all the way round', () => {
  const sizes = [MARK.subject.d, MARK.ring.d, MARK.ring.dim, MARK.dot.d, MARK.now.d, MARK.alwaysOn.d, ARC_WIDTH]
  for (const h of MINUTES) {
    const [x, y] = railPoint(h, OUTER)
    for (const d of sizes) {
      const m = roundRectInside(discBox(x, y, d))
      assert.ok(m >= MARGIN, `${d} px dot at rail hour ${h.toFixed(2)}: ${m.toFixed(2)} px from the edge`)
    }
  }
})

test('the arc (runs and corners) and the base ring stay 4 px inside the screen', () => {
  for (const [h0, h1] of SPANS) {
    for (const p of railPieces(h0, h1 % 12)) {
      if (p.kind === 'line') {
        const m = roundRectInside(lineBox(p, ARC_WIDTH))
        assert.ok(m >= MARGIN, `run ${JSON.stringify(p)}: ${m.toFixed(2)} px`)
      } else {
        for (let a = p.from; a <= p.to; a += 1) {
          const t = (a * Math.PI) / 180
          const m = inside(p.cx + p.r * Math.cos(t), p.cy + p.r * Math.sin(t)) - ARC_WIDTH / 2
          assert.ok(m >= MARGIN, `corner at ${a}°: ${m.toFixed(2)} px`)
        }
      }
    }
  }
  for (const h of MINUTES) assert.ok(inside(...railPoint(h, OUTER).slice(0, 2)) - RING_WIDTH / 2 >= MARGIN)
})

test('the dots\' black halos stop before the ticks', () => {
  const halo = Math.max(MARK.subject.halo, MARK.ring.halo, MARK.dot.halo, MARK.now.halo) / 2
  const band = OUTER.inset + halo // the halos reach this far from the edge
  for (const h of TICK_HOURS) {
    const { x, y, w, h: hh } = tickBox(h)
    for (const [px, py] of [[x, y], [x + w, y], [x, y + hh], [x + w, y + hh]]) {
      // ticks 1, 5, 7 and 11 sit 3.5° into a corner: their square ends may graze a halo by a fraction of a pixel
      assert.ok(inside(px, py) >= band - 0.5, `tick ${h} reaches into the halos`)
    }
  }
})

test('the hour ticks sit on straight runs (axis-aligned boxes are exact enough)', () => {
  for (const h of TICK_HOURS) {
    const dir = (railPoint(h, INNER)[2] * 180) / Math.PI
    const off = Math.abs(((dir % 90) + 90 + 45) % 90 - 45)
    assert.ok(off <= 4, `tick ${h} is ${off.toFixed(1)}° off`)
  }
})

test('the 12 numeral stays clear of the date (x 40..150, y 40..64)', () => {
  const [x, y] = railPoint(NUMERALS[0][0], INNER)
  assert.ok(x - 20 > 150 || y + 10 <= 40, `12 at ${x}, ${y}`)
})

test('the always-on dot is centred exactly where the lit subject dot is', () => {
  for (const h of MINUTES) {
    const [x, y] = railPoint(h, OUTER)
    const lit = discBox(x, y, MARK.subject.d), dim = discBox(x, y, MARK.alwaysOn.d)
    assert.equal(lit.x + lit.w / 2, dim.x + dim.w / 2)
    assert.equal(lit.y + lit.h / 2, dim.y + dim.h / 2)
  }
})

test('widget props: ARC box and angles, base ring (device conventions measured on the watch, see DEVICE)', () => {
  assert.deepEqual(DEVICE, { arcAngleOffset: 0, arcStroke: 'inside', strokeRect: 'inside' })
  const [corner] = railPieces(1.5, 2).filter((p) => p.kind === 'corner')
  const props = arcProps(corner, ARC_WIDTH)
  assert.equal(props.x + props.w / 2, corner.cx)
  // The watch draws the stroke inside the box: the box is half a line wider all round
  assert.equal(props.w, 2 * OUTER.r + ARC_WIDTH)
  assert.ok(props.start_angle >= -90 && props.end_angle <= 0 && props.start_angle < props.end_angle)
  const full = arcProps(railPieces(4, 5.5).find((p) => p.kind === 'corner'), ARC_WIDTH)
  assert.deepEqual([full.start_angle, full.end_angle], [0, 90]) // the bottom-right corner, whole
  const ring = ringProps(OUTER, RING_WIDTH)
  assert.ok(ring.x >= OUTER.inset - 2 && ring.x <= OUTER.inset - 1 && ring.radius >= OUTER.r)
})

test('the arc shows only once its end is within the phone\'s rail window', () => {
  const upcoming = (inMin) => ({ ongoing: false, inMin, endInMin: inMin + 30 })
  const ongoing = (endInMin) => ({ ongoing: true, inMin: -20, endInMin })
  assert.equal(arcInWindow(null, 60), false)
  assert.equal(arcInWindow(upcoming(60), 60), true)
  assert.equal(arcInWindow(upcoming(61), 60), false)
  assert.equal(arcInWindow(upcoming(0), 30), true)
  assert.equal(arcInWindow(upcoming(700), 720), true)
  assert.equal(arcInWindow(ongoing(30), 30), true) // ongoing: counts to the end, not the start
  assert.equal(arcInWindow(ongoing(31), 30), false)
  assert.equal(arcInWindow(ongoing(170), 180), true)
})

test('no ARC collapses to start === end: sub-pixel corner leftovers are skipped, the rest round outwards', () => {
  // Now 13:51 and an event at 14:30: the span starts 0.02° before the top-right corner ends
  assert.equal(arcProps(railPieces(1 + 51 / 60, 2.5)[0], ARC_WIDTH), null)
  for (let m0 = 0; m0 < 720; m0++) {
    for (let span = 1; span <= 720; span++) {
      for (const p of railPieces(m0 / 60, ((m0 + span) % 720) / 60)) {
        if (p.kind !== 'corner') continue
        const props = arcProps(p, ARC_WIDTH)
        if (props) assert.ok(props.start_angle < props.end_angle, `${m0}+${span} min: ${props.start_angle}→${props.end_angle}`)
        else assert.ok((p.r * (p.to - p.from) * Math.PI) / 180 < 1, `${m0}+${span} min: a real corner skipped`)
      }
    }
  }
})
