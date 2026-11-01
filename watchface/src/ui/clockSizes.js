// Where the clocks are, per layout — used by the normal and the always-on clocks, so the time
// doesn't move when the watch wakes up (and by tools/gen-assets.mjs for the digit images).
// left/top/size: the CSS box from the design (line-height 0.9).
// ampm: AM/PM's right edge and top — above the minutes, clear of the date row.
// The widest 24-hour time, "23:58", ends at x 349, before the 3 o'clock numeral.
export const CLOCK = {
  clear: { left: 34, top: 120, size: 156, ampm: { right: 350, top: 112 } },
  next: { left: 34, top: 82, size: 148, ampm: { right: 350, top: 72 } },
}
export const CLOCK_SIZES = [CLOCK.clear.size, CLOCK.next.size]
export const AMPM_SIZE = 24

// The Today card's small clock (line-height 1.2)
export const SMALL_CLOCK = { left: 40, top: 42, size: 26 }
