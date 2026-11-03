// perf test build, on the watch: times every build() and refresh of the face, counts widgets created
// and setProperty calls (through zosUi.js), and shows the numbers on screen in both scenes.
// Added to the build copy only (tools/test-builds/perf/instrument.mjs): never part of the real face.
//
// The watch rebuilds the face on every lit ↔ dim switch, so each instance stores its numbers per
// scene (localStorage 'perf-lit' / 'perf-dim'): the lit screen shows the last dim build's too, and
// the dim screen the last lit one's.
//
// Times are Date.now() differences in ms. 'res' is the smallest non-zero difference seen so far (all
// timed spans, incl. each createWidget/setProperty call): the clock's resolution, or near it.
import ui from '@zos/ui'
import { getScene, SCENE_AOD } from '@zos/app'
import { Time } from '@zos/sensor'
import { localStorage } from '@zos/storage'

// Counters zosUi.js adds to: calls the face makes (this file's own widgets don't count)
export const count = { widgets: 0, aod: 0, set: 0, createMs: 0, setMs: 0 }

const RES = 'perf-res'
let res = 0

// ms since t0, noting the clock's resolution
export function since(t0) {
  const d = Date.now() - t0
  if (d > 0 && (!res || d < res)) res = d
  return d
}

function load(key) {
  try {
    const s = localStorage.getItem(key, '')
    return s ? JSON.parse(s) : null
  } catch (e) {
    return null
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    // no storage: only this instance's numbers show
  }
}

function sceneName() {
  try {
    const scene = getScene()
    if (typeof SCENE_AOD === 'number' && scene === SCENE_AOD) return 'dim'
    return scene === 1 ? 'lit' : 'scene' + scene
  } catch (e) {
    return 'scene?'
  }
}

const pad = (n) => (n < 10 ? '0' : '') + n
function clock() {
  try {
    const t = new Time()
    return `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`
  } catch (e) {
    return '--:--'
  }
}

const snapshot = () => ({ ...count })
const diff = (a, b) => ({ w: b.widgets - a.widgets, set: b.set - a.set })

let rec = null // this instance: { scene, at, build, first, widgets, aod, set, createMs, setMs, last, n }
let lines = [] // the text widgets, per level
let key = ''

// ── Screen ──
const LINES = 10
const SIZE = 13
const STEP = 15
const TOP = 230 // the Today card's free band (between the event's times and its list), lit and dim

function createLines() {
  const level = (show_level, color) => {
    const out = []
    for (let i = 0; i < LINES; i++) {
      out.push(ui.createWidget(ui.widget.TEXT, {
        x: 36, y: TOP + i * STEP, w: 318, h: STEP + 4, text_size: SIZE, color, text: '',
        align_h: ui.align.LEFT, align_v: ui.align.TOP, text_style: ui.text_style.NONE, show_level,
      }))
    }
    return out
  }
  const out = [level(ui.show_level.ONAL_AOD, 0x8a8a8a)]
  if (rec.scene !== 'dim') out.push(level(ui.show_level.ONLY_NORMAL, 0xffa040))
  return out
}

const ms = (n) => (n === undefined || n === null ? '?' : n + ' ms')

// An instance's numbers in 4 lines: its build, what the build did, its last refresh, the first
// refresh's spans
function summary(r) {
  const n = r.n || {}
  const last = r.last
  return [
    `${r.scene.toUpperCase()} ${r.at} · build ${ms(r.build)} · 1st ${ms((r.first || {}).ms)}`,
    `w ${r.widgets} (${r.aod} aod) set ${r.set} · in calls ${r.createMs}+${r.setMs} ms`,
    (last ? `${last.kind} ${last.at} ${ms(last.ms)} set ${last.set}${last.w ? ' w ' + last.w : ''}` : 'no refresh yet') +
      ' · ' + (Object.keys(n).map((k) => k[0] + n[k]).join(' ') || '-'),
    '1st ' + spanText((r.first || {}).sp),
  ]
}

// This instance, then the other scene's last one (stored)
function text() {
  const otherName = rec.scene === 'dim' ? 'lit' : 'dim'
  const other = load('perf-' + otherName)
  const own = summary(rec)
  own[0] += ` · res ${res || '?'}`
  return own.concat(other ? summary(other) : [`no ${otherName} build yet`, '', '', ''])
}
function show() {
  const t = text().concat(benchLine.split('\n'))
  lines.forEach((level) => level.forEach((w, i) => w.setProperty(ui.prop.TEXT, t[i])))
}

function store() {
  const stored = Number(load(RES)) || 0
  if (res && (!stored || res < stored)) save(RES, res)
  else if (stored) res = stored
  save(key, rec)
}

// ── Hooks the instrumented index.js calls ──

// The face's WatchFace options → the same options, build() timed. (index.js still calls WatchFace
// itself: calling it from this module left the face blank on the watch.)
export function wrap(options) {
  const build = options.build
  return {
    ...options,
    build() {
      rec = { scene: sceneName(), at: clock(), n: {} }
      key = 'perf-' + rec.scene
      Object.keys(count).forEach((k) => (count[k] = 0))
      const t0 = Date.now()
      try {
        build.call(this)
      } finally {
        rec.build = since(t0)
        Object.assign(rec, { widgets: count.widgets, aod: count.aod, set: count.set, createMs: count.createMs, setMs: count.setMs })
        try {
          benchLine = 'x200 ms ' + bench()
          lines = createLines()
          store()
          show()
        } catch (e) {
          // the face itself must still work
        }
      }
    },
  }
}

// Calibration, once per instance after the build is timed: what basic JS costs on this watch.
// 200 × each: a Zepp proxy lookup (ui.prop.MORE), the same value from a plain object, an object
// spread like the widget helpers do, and a plain function call.
function bench() {
  const N = 200
  const time = (fn) => {
    const t0 = Date.now()
    for (let i = 0; i < N; i++) fn(i)
    return Date.now() - t0
  }
  let sink = 0
  const plain = { MORE: ui.prop.MORE }
  const base = { x: 1, y: 2, w: 3, h: 4, color: 5, text: '', text_size: 16 }
  const f = (i) => i + 1
  const arr3 = [1, 2, 3]
  return [
    'loop ' + time(() => { sink++ }),
    'px ' + time(() => { sink += ui.prop.MORE }),
    'pl ' + time(() => { sink += plain.MORE }),
    'sp ' + time((i) => { sink += ({ ...base, show_level: i }).show_level }),
    'fn ' + time((i) => { sink += f(i) }),
    'now ' + time(() => { sink += Date.now() & 1 }),
  ].join(' ') + (sink ? '' : ' ') + '\n' + [
    'as ' + time((i) => { sink += Object.assign({}, base, { show_level: i }).show_level }),
    'arr ' + time(() => { sink += [...arr3].length }),
    'dst ' + time(() => { const [a, b] = arr3; sink += a + b }),
    'idx ' + time(() => { sink += arr3[0] + arr3[1] }),
    'forof ' + time(() => { for (const v of arr3) sink += v }),
    'for ' + time(() => { for (let k = 0; k < arr3.length; k++) sink += arr3[k] }),
    'each ' + time(() => { arr3.forEach((v) => { sink += v }) }),
  ].join(' ')
}
let benchLine = ''

// Named spans within the current refresh (summed): where its time goes. Nested spans count in their
// parent too (hr is part of st, tw of show and mk*).
let spans = {}
export function span(name, fn) {
  const t0 = Date.now()
  try {
    return fn()
  } finally {
    spans[name] = (spans[name] || 0) + since(t0)
  }
}
const spanText = (sp) => Object.keys(sp || {}).map((k) => k + sp[k]).join(' ') || '-'

// fn, timed as a refresh of this kind: 'first' (inside build), 'tick', 'resume', 'heart'
export function timed(kind, fn) {
  return function (...args) {
    const before = snapshot()
    spans = {}
    const t0 = Date.now()
    try {
      return fn.apply(this, args)
    } finally {
      const took = since(t0)
      const d = diff(before, count)
      if (kind === 'first') {
        rec.first = { ms: took, ...d, sp: spans }
      } else if (rec) {
        rec.last = { kind, at: clock().slice(0, 5), ms: took, ...d, sp: spans }
        rec.n[kind] = (rec.n[kind] || 0) + 1
        try {
          store()
          show()
        } catch (e) {
          // keep refreshing
        }
      }
    }
  }
}
