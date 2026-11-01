// The clock's digits sit in fixed-width slots (so the system-drawn always-on clock matches).
// Every digit's text box must be wider than the digit itself, or the watch stops centring it and the
// digit slides sideways (seen with "0" and "4").
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { METRICS } from '../../watchface/src/ui/metrics.js'
import { slotLayout, glyphBox } from '../../watchface/src/ui/clockSlots.js'
import { CLOCK, SMALL_CLOCK } from '../../watchface/src/ui/clockSizes.js'

const clocks = [
  ['clear', 'digits', CLOCK.clear.size],
  ['next', 'digits', CLOCK.next.size],
  ['Today card', 'semibold', SMALL_CLOCK.size],
]

for (const [name, font, size] of clocks) {
  test(`${name} clock: every digit fits its box, centred on its slot`, () => {
    for (const s of slotLayout('01:23 45:67 89', font, size, 0).filter((s) => /\d/.test(s.ch))) {
      const box = glyphBox(s, size)
      const glyph = METRICS[font].widths[s.ch] * size
      assert.ok(box.w > glyph + 2, `"${s.ch}" (${glyph.toFixed(1)} px) needs a wider box than ${box.w} px`)
      assert.equal(box.x + box.w / 2, s.x + s.w / 2, `"${s.ch}" box is not centred on its slot`)
    }
  })
}

test('the widest 24-hour time ends before the 3 o\'clock numeral', () => {
  const slots = slotLayout('23:58', 'digits', CLOCK.clear.size, CLOCK.clear.left)
  const last = slots[slots.length - 1]
  assert.ok(last.x + last.w <= 350, `ends at ${last.x + last.w}`)
})
