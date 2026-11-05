// The lit screen's layouts (the wrist is raised), each made the first time it's shown:
//   clear   nothing coming up soon: big clock, "Free until …"
//   next    an event is near (or on): smaller clock, the event, the lime arc
//   focus   the Today card: during / just before an event
// Which one shows: data/agenda.js chooseLayout. The screen switches between them (ui/screen.js).
import { lazy } from '../../ui/lazy.js'
import { createFrame } from './frame.js'
import { createClearLayout } from './clear.js'
import { createNextLayout } from './next.js'
import { createFocusLayout } from './focus.js'

export function createLitLayouts(screen) {
  const frame = createFrame(screen) // background and rail now, under everything
  return {
    clear: lazy(() => frame.layout(createClearLayout)),
    next: lazy(() => frame.layout(createNextLayout)),
    focus: lazy(() => frame.layout(createFocusLayout)),
  }
}
