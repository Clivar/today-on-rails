// What building and refreshing the face costs, counted in calls to the watch: the real watchface
// entry (watchface/watchface/index.js) runs with mocked @zos modules (zosMock.mjs) on the perf test
// build's busy agenda (tools/test-builds/perf.js) at a fixed time. The watch rebuilds the face on every
// lit ↔ dim switch, so these costs are paid on every wrist raise and every dim.
// The budgets are today's numbers plus a small margin: a change that makes a build or a refresh do
// more work fails here; raise a budget only on purpose. Timings on the device: tools/build.sh perf.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { installZosMock, SCENE_LIT, SCENE_AOD } from './zosMock.mjs'
import { minuteOf, parseAgenda, chooseLayout } from '../../watchface/src/data/agenda.js'
import { agendaText } from '../../tools/test-builds/perf.js'
import { writeAgenda } from '../../tools/test-builds/shared/agendaText.js'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const zos = installZosMock()
let face = null
globalThis.WatchFace = (options) => {
  face = options
}
await import('../../watchface/watchface/index.js')

const START = minuteOf({ year: 2026, month: 11, day: 3, hours: 9, minutes: 42 }) // a Tuesday

const sum = (bag) => Object.values(bag).reduce((s, n) => s + n, 0)
const sensorCalls = (stats) => sum(stats.calls)

// One step's counts, as a short line for the test output
function summary(stats) {
  const list = (bag) => Object.entries(bag).sort(([a], [b]) => a.localeCompare(b)).map(([k, n]) => `${k} ${n}`).join(', ')
  return [
    `widgets ${sum(stats.widgets)} (${list(stats.widgets) || '-'}) by level (${list(stats.levels) || '-'})`,
    `setProperty ${sum(stats.set)} (${list(stats.set) || '-'}) on (${list(stats.setByType) || '-'})`,
    `sensor/app calls ${sensorCalls(stats)} (${list(stats.calls) || '-'})`,
    `storage (${list(stats.storage) || '-'})`,
  ].join('\n    ')
}

// A face instance in a scene: build, then what the watch does next. Each step's counts on their own.
function instance(scene, minute = START) {
  zos.state.scene = scene
  zos.state.minute = minute
  zos.state.agenda = agendaText(minute)
  zos.state.storage.clear()
  zos.newInstance()
  const step = (fn) => {
    zos.reset()
    fn()
    return zos.stats
  }
  return {
    build: step(() => face.build()),
    resume: step(() => zos.resume()), // wake with nothing new (same minute)
    sameHeart: step(() => zos.heartReading()), // a background reading with the same value
    tick: step(() => zos.tick()), // the next minute
    resumeAfterTick: step(() => zos.resume()),
  }
}

function report(t, name, run) {
  for (const [step, stats] of Object.entries(run)) t.diagnostic(`${name} ${step}:\n    ${summary(stats)}`)
}

test('the perf agenda: the Today card for an ongoing event, at any time of day', () => {
  for (let minute = START; minute < START + 1440; minute += 13) {
    const d = new Date(minute * 60000)
    const now = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hours: d.getUTCHours(), minutes: d.getUTCMinutes() }
    const agenda = parseAgenda(agendaText(minute), now)
    assert.equal(agenda.valid, true)
    const { layout, subject } = chooseLayout(agenda)
    assert.deepEqual([layout, subject.title, subject.ongoing], ['focus', 'Team call', true], `${now.hours}:${now.minutes}`)
    assert.ok(agenda.items.length >= 6)
  }
})

// Budgets: today's count (2026-11-04: layouts and frame parts made on first show, every widget
// change-tracked) plus a few calls of room. Lower them when the face gets cheaper.
const BUDGET = {
  lit: { widgets: 69 + 3, set: 26 + 4, sensor: 21 + 2, tickSet: 6 + 4 },
  dim: { widgets: 10 + 1, set: 4 + 2, sensor: 13 + 1, tickSet: 0 + 2 },
  readInputs: 13 + 1, // sensor/app calls of a refresh with nothing new (a wake): it only reads
  readInputsDim: 10 + 1, // the same while dimmed: no battery, heart or steps
}

test('lit: builds both widget sets within budget; a wake or a reading with nothing new costs no drawing', (t) => {
  const run = instance(SCENE_LIT)
  report(t, 'lit', run)
  const { build } = run
  assert.equal(build.levels.unflagged, 1, 'only the WIDGET_DELEGATE is unflagged') // every drawn widget says when it shows
  assert.ok(build.levels.ONLY_NORMAL > 0 && build.levels.ONAL_AOD > 0, 'both sets')
  assert.ok(sum(build.widgets) <= BUDGET.lit.widgets, `widgets ${sum(build.widgets)} > ${BUDGET.lit.widgets}`)
  assert.ok(sum(build.set) <= BUDGET.lit.set, `setProperty ${sum(build.set)} > ${BUDGET.lit.set}`)
  assert.ok(sensorCalls(build) <= BUDGET.lit.sensor, `sensor calls ${sensorCalls(build)} > ${BUDGET.lit.sensor}`)
  assert.equal(build.storage.setItem || 0, 0, 'a build writes nothing to storage (no buzz due)')
  for (const step of ['resume', 'sameHeart', 'resumeAfterTick']) {
    assert.equal(sum(run[step].widgets), 0, `${step}: no widgets`)
    assert.equal(sum(run[step].set), 0, `${step}: no setProperty`)
  }
  assert.ok(sum(run.tick.set) > 0, 'the next minute redraws')
  assert.ok(sum(run.tick.set) <= BUDGET.lit.tickSet, `tick setProperty ${sum(run.tick.set)} > ${BUDGET.lit.tickSet}`)
  assert.equal(sum(run.tick.widgets), 0, 'a tick creates no widgets')
  assert.ok(sensorCalls(run.resume) <= BUDGET.readInputs, `wake reads ${sensorCalls(run.resume)} > ${BUDGET.readInputs}`)
})

test('dimmed: builds only the always-on set, a fraction of the lit build', (t) => {
  const run = instance(SCENE_AOD)
  report(t, 'dim', run)
  const { build } = run
  assert.equal(build.levels.ONLY_NORMAL || 0, 0, 'no normal widgets while dimmed')
  assert.equal(build.widgets.CANVAS || 0, 0, 'no canvas (a flagged canvas cannot draw while dimmed)')
  assert.ok(sum(build.widgets) <= BUDGET.dim.widgets, `widgets ${sum(build.widgets)} > ${BUDGET.dim.widgets}`)
  assert.ok(sum(build.set) <= BUDGET.dim.set, `setProperty ${sum(build.set)} > ${BUDGET.dim.set}`)
  assert.ok(sensorCalls(build) <= BUDGET.dim.sensor, `sensor calls ${sensorCalls(build)} > ${BUDGET.dim.sensor}`)
  for (const step of ['resume', 'sameHeart', 'resumeAfterTick']) {
    assert.equal(sum(run[step].widgets), 0, `${step}: no widgets`)
    assert.equal(sum(run[step].set), 0, `${step}: no setProperty`)
  }
  assert.ok(sum(run.tick.set) <= BUDGET.dim.tickSet, `tick setProperty ${sum(run.tick.set)} > ${BUDGET.dim.tickSet}`)
  assert.equal(sum(run.tick.widgets), 0)
  assert.ok(sum(build.widgets) * 4 < BUDGET.lit.widgets, 'well under a quarter of the lit build')
  assert.ok(sensorCalls(run.resume) <= BUDGET.readInputsDim, `wake reads ${sensorCalls(run.resume)} > ${BUDGET.readInputsDim}`)
})

// ── Made on first show ─────────────────────────────────────────────────────────────────────────

// The widgets of a part, by what they're made with (components/*.js)
const is = {
  bigClock: (w) => w.type === 'TEXT' && (w.props.text_size === 156 || w.props.text_size === 148),
  smallClock: (w) => w.type === 'TEXT' && w.props.text_size === 26,
  date: (w) => w.type === 'TEXT' && w.props.text_size === 20 && w.props.x === 40,
  battery: (w) => w.type === 'STROKE_RECT' && w.props.h === 11,
  complications: (w) => w.type === 'TEXT_IMG' || (w.type === 'IMG' && /weather|heart|steps/.test(w.props.src)),
  cardTitle: (w) => w.type === 'TEXT' && w.props.text_size === 56,
  freeUntil: (w) => w.type === 'TEXT' && w.props.text_size === 20 && w.props.x === 60,
  nextTitle: (w) => w.type === 'TEXT' && w.props.text_size === 34,
  aodClock: (which) => (w) => w.type === 'IMG_TIME' && w.props.hour_array[0].startsWith(`images/${which}/`),
}
const NORMAL = 'ONLY_NORMAL'
const AOD = 'ONAL_AOD'
const shown = (w) => w.props.visible !== false
const made = (level, part) => zos.widgets.filter((w) => w.props.show_level === level && part(w))

test('lit Today card: no big clock, date, battery or complications made; one always-on clock', () => {
  const { build } = instance(SCENE_LIT) // the perf agenda: the Today card
  for (const part of ['bigClock', 'date', 'battery', 'complications']) {
    assert.equal(made(NORMAL, is[part]).length + made(AOD, is[part]).length, 0, part)
  }
  assert.ok(made(NORMAL, is.smallClock).length > 0 && made(NORMAL, is.cardTitle).length > 0, 'the card is there')
  assert.equal(build.widgets.IMG_TIME, 1, 'only the always-on clock the card shows')
  assert.equal(made(AOD, is.aodClock('aodsmall')).length, 1)
})

test('dimmed: exactly one IMG_TIME, no date on the Today card, no screen-on sensors', () => {
  const { build } = instance(SCENE_AOD)
  assert.equal(build.widgets.IMG_TIME, 1)
  assert.equal(made(AOD, is.aodClock('aodsmall')).length, 1)
  assert.equal(made(AOD, is.date).length, 0)
  for (const sensor of ['new Battery', 'new HeartRate', 'new Step', 'HeartRate.onLastChange']) {
    assert.equal(build.calls[sensor] || 0, 0, sensor)
  }
})

test('widgets stack right: background, then the rail, the layout, the record button on top', () => {
  instance(SCENE_LIT)
  const normal = zos.widgets.filter((w) => w.props.show_level === NORMAL)
  assert.deepEqual([normal[0].type, normal[0].props.w, normal[0].props.h], ['FILL_RECT', 390, 450], 'background first')
  assert.equal(normal[1].type, 'STROKE_RECT', 'then the rail (its base ring)')
  const button = normal.findIndex((w) => w.type === 'BUTTON')
  // The Today card's own widgets (small clock, title, list) are all under the button
  const card = normal.filter((w) => is.smallClock(w) || is.cardTitle(w) || w.type === 'CIRCLE')
  assert.ok(card.length > 0 && card.every((w) => normal.indexOf(w) < button), 'the card under the record button')
})

// A face instance on agendas that switch layouts: { clear | next | focus } → its agenda text
const CFG = 'next=360 focus=0 during=1 ready=0 rail=180 buzz=none'
const AGENDA = {
  clear: (m) => writeAgenda(m, CFG, []),
  next: (m) => writeAgenda(m, CFG, [{ at: START + 120, end: START + 180, title: 'Review' }]),
  focus: (m) => writeAgenda(m, CFG, [{ at: START - 30, end: START + 60, title: 'Team call' }, { at: START + 100, title: 'Walk' }]),
}
function switching(scene, first) {
  zos.state.scene = scene
  zos.state.minute = START
  zos.state.agenda = AGENDA[first](START)
  zos.state.storage.clear()
  zos.newInstance()
  face.build()
  return (layout) => {
    zos.state.agenda = AGENDA[layout](zos.state.minute + 1)
    zos.reset()
    zos.tick()
    return zos.stats
  }
}

test('lit: switching layouts makes each once, at its level, and shows only the current one', () => {
  const to = switching(SCENE_LIT, 'clear')
  const visible = (part) => made(NORMAL, part).some(shown)
  const check = (layout) => {
    const on = { clear: ['bigClock', 'date', 'battery', 'freeUntil'], next: ['bigClock', 'date', 'battery', 'nextTitle'], focus: ['smallClock', 'cardTitle'] }[layout]
    for (const part of ['bigClock', 'date', 'battery', 'freeUntil', 'nextTitle', 'smallClock', 'cardTitle']) {
      if (made(NORMAL, is[part]).length) assert.equal(visible(is[part]), on.includes(part), `${layout}: ${part}`)
    }
    assert.ok(on.every((part) => visible(is[part])), `${layout} shows`)
  }
  check('clear')
  for (const layout of ['focus', 'next', 'clear', 'focus']) {
    const stats = to(layout)
    check(layout)
    assert.equal(stats.levels.unflagged || 0, 0, `${layout}: every new widget has a level`)
  }
  // Second visits made nothing new: one of each
  assert.equal(made(NORMAL, is.cardTitle).length, 2)
  assert.equal(made(NORMAL, is.freeUntil).length, 1)
  assert.equal(made(NORMAL, (w) => w.type === 'BUTTON').length, 1)
  assert.equal(made(NORMAL, is.complications).length, 5) // IMG and TEXT_IMG: the weather icon, 2 temperatures, heart and steps icons
  // The always-on set followed along at its own level: its clocks, one shown
  assert.equal(made(AOD, (w) => w.type === 'IMG_TIME').length, 3)
  assert.deepEqual(made(AOD, (w) => w.type === 'IMG_TIME').filter(shown).map((w) => w.props.hour_array[0]), ['images/aodsmall/d0.png'])
})

test('dimmed: a layout switch makes only always-on widgets, and one clock shows', () => {
  const to = switching(SCENE_AOD, 'focus')
  for (const layout of ['clear', 'next', 'focus', 'clear']) {
    const stats = to(layout)
    assert.equal(stats.levels.ONLY_NORMAL || 0, 0, `${layout}: nothing for the lit screen`)
    assert.equal(stats.levels.unflagged || 0, 0, `${layout}: every new widget has a level`)
    const clocks = made(AOD, (w) => w.type === 'IMG_TIME').filter(shown)
    const want = layout === 'focus' ? 'aodsmall' : layout === 'clear' ? 'aod156' : 'aod148'
    assert.deepEqual(clocks.map((w) => w.props.hour_array[0]), [`images/${want}/d0.png`], layout)
    assert.equal(made(AOD, is.date).filter(shown).length, layout === 'focus' ? 0 : 1, `${layout}: date`)
  }
  assert.equal(made(AOD, is.date).length, 1, 'one date, made once')
})

test('a layout whose first draw fails halfway is still hidden on the next switch', () => {
  const ui = zos.modules.ui.default
  const createWidget = ui.createWidget
  let broken = true
  // The Today card's title throws while drawing (once made)
  ui.createWidget = function (type, props) {
    const w = createWidget.call(this, type, props)
    if (is.cardTitle(w)) {
      const set = w.setProperty
      w.setProperty = (prop, value) => {
        if (broken) throw new Error('broken')
        return set(prop, value)
      }
    }
    return w
  }
  try {
    const to = switching(SCENE_LIT, 'clear')
    to('focus') // the card's first draw throws: the error shows
    const error = zos.widgets.find((w) => w.type === 'TEXT' && String(w.props.text).startsWith('Today On Rails: '))
    assert.ok(error && shown(error), 'the error shows')
    broken = false
    to('clear')
    assert.ok(!made(NORMAL, is.smallClock).some(shown), 'the half-drawn card is hidden')
    assert.ok(!made(NORMAL, is.cardTitle).some(shown))
    assert.ok(made(NORMAL, is.bigClock).some(shown) && made(NORMAL, is.freeUntil).every(shown), 'clear shows')
    assert.ok(!shown(error), 'the error is gone')
  } finally {
    ui.createWidget = createWidget
  }
})

test('no continuous sensors: only the minute tick and the background heart reading are listened to', () => {
  const run = instance(SCENE_LIT)
  assert.equal(run.build.calls['Time.onPerMinute'], 1)
  assert.equal(run.build.calls['HeartRate.onLastChange'], 1)
  const listens = Object.keys(run.build.calls).filter((k) => /\.on[A-Z]/.test(k)).sort()
  assert.deepEqual(listens, ['HeartRate.onLastChange', 'Time.onPerMinute'])
})

// The perf test build (tools/build.sh perf) measures the same on the watch, with the measuring added to a
// copy of the face by tools/test-builds/perf/instrument.mjs. Here: that rewrite still fits index.js, and
// the copy counts what this test counts and shows it on screen in both scenes.
test('the perf build instruments the face and shows the same counts', async (t) => {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-copy-'))
  t.after(() => fs.rmSync(copy, { recursive: true, force: true }))
  const face = path.join(ROOT, 'watchface')
  for (const part of ['app.json', 'src', 'watchface']) fs.cpSync(path.join(face, part), path.join(copy, part), { recursive: true })
  fs.writeFileSync(path.join(copy, 'package.json'), '{ "type": "module" }\n')
  execFileSync(process.execPath, [path.join(ROOT, 'tools/test-builds/perf/instrument.mjs'), copy])

  let perfFace = null
  globalThis.WatchFace = (options) => {
    perfFace = options
  }
  await import(pathToFileURL(path.join(copy, 'watchface/index.js')).href)
  assert.ok(perfFace, 'the instrumented entry registers the face')

  // The perf lines are the last 10 texts per level (the last 2: the JS calibration) (created after the face's widgets, on top)
  const screen = (level) => zos.widgets.filter((w) => w.type === 'TEXT' && w.props.show_level === level).slice(-10).map((w) => w.props.text)
  const run = (scene) => {
    zos.state.scene = scene
    zos.state.minute = START
    zos.state.agenda = agendaText(START)
    zos.newInstance()
    perfFace.build()
    zos.tick()
    return { aod: screen('ONAL_AOD'), normal: screen('ONLY_NORMAL') }
  }
  zos.state.storage.clear()
  const first = run(SCENE_LIT)
  const dim = run(SCENE_AOD)
  const lit = run(SCENE_LIT)
  t.diagnostic('lit screen:\n    ' + lit.normal.join('\n    '))
  t.diagnostic('dim screen:\n    ' + dim.aod.join('\n    '))

  // What the uninstrumented face does (the tests above)
  const plain = { lit: instance(SCENE_LIT), dim: instance(SCENE_AOD) }
  const counts = (run) => `w ${sum(run.build.widgets)} (${run.build.levels.ONAL_AOD} aod) set ${sum(run.build.set)}`
  const tick = (run) => new RegExp(`^tick \\d\\d:\\d\\d \\d+ ms set ${sum(run.tick.set)} · t1$`)
  assert.match(first.normal[4], /^no dim build yet/)
  assert.equal(dim.normal.length, 0, 'a dimmed instance adds no normal lines')
  const own = (lines) => [lines[0].replace(/ · res .*/, ''), lines[1], lines[2], lines[3]]
  assert.deepEqual(dim.aod.slice(4, 8), own(first.normal), 'the dim screen shows the last lit build (stored)')
  assert.deepEqual(lit.normal.slice(4, 8), own(dim.aod), 'the lit screen shows the last dim build (stored)')
  for (const [lines, own, other] of [[lit.normal, plain.lit, plain.dim], [dim.aod, plain.dim, plain.lit]]) {
    assert.match(lines[0], /^(LIT|DIM) \d\d:\d\d:\d\d · build \d+ ms · 1st \d+ ms · res /)
    assert.equal(lines[1].split(' · ')[0], counts(own))
    assert.match(lines[2], tick(own))
    assert.match(lines[3], /^1st .*\bin\d+ .*\bst\d+ .*\bshow\d+/) // where the first refresh's time went
    assert.match(lines[4], /^(LIT|DIM) \d\d:\d\d:\d\d · build \d+ ms · 1st \d+ ms$/)
    assert.equal(lines[5].split(' · ')[0], counts(other))
    assert.match(lines[6], tick(other))
  }
  assert.ok(lit.normal[0].startsWith('LIT') && dim.aod[0].startsWith('DIM'))
})
