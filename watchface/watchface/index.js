// Today On Rails — watchface for the Amazfit Bip 6. This file only wires the parts together.
//
// Two screens (ui/screen.js): 'lit' when the wrist is raised, 'dim' for always-on. Each has the same
// three layouts, chosen from the agenda and the phone's settings (data/agenda.js → chooseLayout):
//
//   layout   lit                   dim                   when
//   clear    layouts/lit/clear.js  layouts/dim/clear.js  nothing coming up soon
//   next     layouts/lit/next.js   layouts/dim/next.js   an event is near (or on)
//   focus    layouts/lit/focus.js  layouts/dim/focus.js  the Today card: during / just before an event
//
// The watch rebuilds the face on every switch between lit and dim (and after the screen was off),
// so an instance builds the screens the watch can show now (data/refresh.js screensToBuild): a
// dimmed one only the dim screen. Three caches, one place each:
//   drawing   a widget skips writes that change nothing        ui/widgets.js (Widget)
//   creating  a layout or part is made when first shown         ui/lazy.js
//   refresh   a refresh with nothing new is skipped             data/refresh.js
// What must outlive an instance (the last buzz) is kept in storage (data/saved.js).
// The face refreshes every minute (the tick runs while dimmed too), on wake and, when lit, on a new
// heart-rate reading. At chosen moments it buzzes (components/buzzer.js).
import ui from '@zos/ui'

import { createScreen, currentScreen } from '../src/ui/screen.js'
import { createSensors, addLitSensors, readInputs, readState, is24h } from '../src/data/state.js'
import { screensToBuild, refreshKey, createRedrawCheck } from '../src/data/refresh.js'
import { createLitLayouts } from '../src/layouts/lit/index.js'
import { createDimLayouts } from '../src/layouts/dim/index.js'
import { createBuzzer } from '../src/components/buzzer.js'

WatchFace({
  build() {
    const sensors = createSensors()
    const buzzer = createBuzzer()
    const screens = [] // the screens this instance built
    const built = {} // by name: 'lit' | 'dim'
    const redraw = createRedrawCheck()

    // A screen and what it needs. The lit screen alone shows battery, heart rate and steps.
    const makeScreen = (name) => {
      if (name === 'dim') 
        return createScreen('dim', (screen) => createDimLayouts(screen, is24h(sensors.time)))
      
      addLitSensors(sensors)
      sensors.heart.onLastChange(refresh) // a new background reading shows at once (no extra sensor use)
      return createScreen('lit', createLitLayouts)
    }

    // Builds the screens the watch can show now that this instance doesn't have → true if any. Later
    // than build only if a dimmed instance is ever shown lit without a rebuild: the lit screen then
    // appears on the next refresh (wake or minute) instead of staying empty.
    const addScreens = () => {
      const names = screensToBuild(currentScreen())
      let added = false
      for (let i = 0; i < names.length; i++) {
        if (built[names[i]]) continue
        built[names[i]] = makeScreen(names[i])
        screens.push(built[names[i]])
        added = true
      }
      return added
    }

    const refresh = () => {
      if (addScreens()) redraw.forget() // a new screen has nothing on it yet
      let state
      try {
        const inputs = readInputs(sensors)
        if (redraw.same(refreshKey(inputs))) return // the screens already show this
        state = readState(inputs, sensors)
      } catch (e) {
        redraw.forget()
        for (let i = 0; i < screens.length; i++) screens[i].showError(e)
        return
      }
      // Buzz at the moments chosen on the phone, before drawing so the buzz is on time
      try {
        buzzer.check(state)
      } catch (e) {
        // no vibration this time: the face still draws
      }
      // Each screen on its own: a problem in one never blanks the other
      for (let i = 0; i < screens.length; i++) {
        try {
          screens[i].show(state)
        } catch (e) {
          screens[i].showError(e)
        }
      }
    }

    refresh()
    sensors.time.onPerMinute(refresh)
    // Wake: catch up if a minute passed while paused (right after build nothing changed: no work).
    // No pause_call: the watch rebuilds the face as it dims, so drawing on pause would be thrown
    // away — and it ran right in the lit → dim switch, which lagged.
    ui.createWidget(ui.widget.WIDGET_DELEGATE, { resume_call: refresh })
  },

  onDestroy() {},
})
