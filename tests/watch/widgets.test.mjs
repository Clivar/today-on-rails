// Widgets (watchface/src/ui/widgets.js, made by a screen: ui/screen.js): a write that changes nothing
// never reaches the watch, and every widget shows only on its own screen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { installZosMock } from './zosMock.mjs'

const zos = installZosMock()
const { Widget, showAll } = await import('../../watchface/src/ui/widgets.js')
const { createScreen } = await import('../../watchface/src/ui/screen.js')
const widget = (w, props) => new Widget(w, props)

// A stand-in widget that records its setProperty calls
function fake() {
  const calls = []
  return { calls, setProperty: (prop, value) => calls.push([prop, value]) }
}

test('set: skipped while every value is what the widget has; otherwise one call with the props as given', () => {
  const w = fake()
  const t = widget(w, { x: 10, y: 20, w: 30, color: 1 })
  t.set({ x: 10, y: 20 })
  t.set({ color: 1 })
  assert.deepEqual(w.calls, [], 'the creation props are remembered')

  const props = { x: 11, y: 20 }
  t.set(props)
  assert.deepEqual(w.calls, [['MORE', props]], 'all of them, in one call')
  t.set({ x: 11, y: 20 })
  t.set({ x: 11 })
  assert.equal(w.calls.length, 1, 'the write is remembered')
  t.set({ w: 30, color: 2 })
  assert.equal(w.calls.length, 2)
  t.set({ x: 11, y: 20, w: 30, color: 2 })
  assert.equal(w.calls.length, 2)
})

test('setText: skipped when the text is the same, whether it came from the props, set or setText', () => {
  const w = fake()
  const t = widget(w, { text: 'a' })
  t.setText('a')
  assert.deepEqual(w.calls, [])
  t.setText('b')
  t.setText('b')
  assert.deepEqual(w.calls, [['TEXT', 'b']])
  t.set({ text: 'c' })
  t.setText('c')
  assert.deepEqual(w.calls, [['TEXT', 'b'], ['MORE', { text: 'c' }]])
  t.set({ text: 'b' })
  assert.equal(w.calls.length, 3, 'set after setText compares with the last text written')
})

test('show: a new widget shows; only a change of visibility is sent, as a boolean', () => {
  const w = fake()
  const t = widget(w, {})
  t.show(true)
  t.show('yes')
  assert.deepEqual(w.calls, [])
  t.show(false)
  t.show(undefined)
  t.show(0)
  assert.deepEqual(w.calls, [['VISIBLE', false]])
  t.show(1)
  assert.deepEqual(w.calls, [['VISIBLE', false], ['VISIBLE', true]])
})

test('set leaves the visibility alone; place sets and shows', () => {
  const w = fake()
  const t = widget(w, { x: 0 })
  t.show(false)
  t.set({ x: 5 })
  assert.deepEqual(w.calls, [['VISIBLE', false], ['MORE', { x: 5 }]])
  t.place({ x: 5 })
  assert.deepEqual(w.calls.slice(2), [['VISIBLE', true]], 'same place: only shown')
  t.place({ x: 6 })
  assert.deepEqual(w.calls.slice(3), [['MORE', { x: 6 }]], 'already shown: only moved')
})

test('showAll: each widget sends only its own change', () => {
  const ws = [fake(), fake(), fake()]
  const ts = ws.map((w) => widget(w, {}))
  ts[1].show(false)
  showAll(ts, true)
  assert.deepEqual(ws.map((w) => w.calls.length), [0, 2, 0])
  showAll(ts, false)
  showAll(ts, false)
  assert.deepEqual(ws.map((w) => w.calls.length), [1, 3, 1])
})

test('screen.widget / screen.text: made with their props on their screen, which they remember', () => {
  zos.reset()
  const lit = createScreen('lit', () => ({}))
  const shape = lit.widget('FILL_RECT', { x: 1, y: 2, w: 3, h: 4, color: 5 })
  const label = lit.text({ x: 40, y: 50, text_size: 20 })
  assert.equal(zos.stats.levels.ONLY_NORMAL, 2)
  shape.set({ x: 1, y: 2, w: 3, h: 4, color: 5 })
  shape.show(true)
  label.setText('') // text() starts them empty
  label.set({ x: 40, y: 50, text_size: 20 })
  assert.deepEqual(zos.stats.set, {}, 'nothing changed: no call')
  label.setText('Fri 23 Oct')
  shape.set({ x: 2 })
  assert.deepEqual(zos.stats.set, { TEXT: 1, MORE: 1 })
  const [w1, w2] = zos.widgets.slice(-2)
  assert.deepEqual([w1.props.x, w2.props.text], [2, 'Fri 23 Oct'])
})

test('a widget shows only on its screen: lit ONLY_NORMAL, dim ONAL_AOD', () => {
  zos.reset()
  createScreen('lit', () => ({})).text({ text_size: 20 })
  createScreen('dim', () => ({})).text({ text_size: 20 })
  const [lit, dim] = zos.widgets.slice(-2)
  assert.deepEqual([lit.props.show_level, dim.props.show_level], ['ONLY_NORMAL', 'ONAL_AOD'])
})
