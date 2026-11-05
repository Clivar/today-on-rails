// The dim screen's layouts (always-on, only while the watch is worn), each made the first time it's
// shown: the lit layouts' twins, with the clock in the same place and size, dimmed and still (fixed
// times instead of countdowns). The screen switches between them (ui/screen.js).
import { lazy } from '../../ui/lazy.js'
import { createDimFrame } from './frame.js'
import { createDimClearLayout } from './clear.js'
import { createDimNextLayout } from './next.js'
import { createDimFocusLayout } from './focus.js'

export function createDimLayouts(screen, is24) {
  const frame = createDimFrame(screen, is24)
  return {
    clear: lazy(() => createDimClearLayout(screen, frame)),
    next: lazy(() => createDimNextLayout(screen, frame)),
    focus: lazy(() => createDimFocusLayout(screen, frame)),
  }
}
