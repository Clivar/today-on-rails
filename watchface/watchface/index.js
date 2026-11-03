// Today On Rails — watchface for the Amazfit Bip 6.
// Shows one of three layouts, chosen from the agenda and the settings made on the phone
// (src/data/agenda.js → chooseLayout):
//
//   layout   screen on              always-on (dim)           when
//   clear    layouts/clear.js       layouts/alwaysOnClear.js  nothing coming up soon
//   next     layouts/next.js        layouts/alwaysOnNext.js   an event is near (or on)
//   focus    layouts/focus.js       layouts/alwaysOnFocus.js  the Today card: during / just before an event
//
// At chosen moments the watch buzzes (components/buzzer.js), on the same minute tick.
// The watch rebuilds the face on every switch between lit and dim (and after the screen was off),
// so a dimmed instance builds only the always-on widgets (data/refresh.js → setsForScene) and reads
// only what they show (no battery, heart rate or steps); a lit one builds both sets. Each set makes
// only what it shows: a layout and the frame parts it uses are made the first time they're shown
// (layouts/frame.js: the order they stack in). The normal widgets show only while lit, the
// always-on ones only while dimmed. The face refreshes every minute (the tick runs while dimmed
// too), on wake and, when lit, on a new heart-rate reading, and skips a refresh when nothing it
// shows has changed. What must outlive an instance is kept in storage (data/saved.js).
import ui from '@zos/ui'
import { getScene, SCENE_AOD } from '@zos/app'

import { C } from '../src/ui/theme.js'
import { text, setText, setVisible, withWidgetLevel } from '../src/ui/widgets.js'
import { createSensors, addScreenOnSensors, readInputs, readState, is24h } from '../src/data/state.js'
import { setsForScene, refreshKey } from '../src/data/refresh.js'
import { createFrame } from '../src/layouts/frame.js'
import { createClearLayout } from '../src/layouts/clear.js'
import { createNextLayout } from '../src/layouts/next.js'
import { createFocusLayout } from '../src/layouts/focus.js'
import { createAlwaysOnFrame } from '../src/layouts/alwaysOnFrame.js'
import { createAlwaysOnClearLayout } from '../src/layouts/alwaysOnClear.js'
import { createAlwaysOnNextLayout } from '../src/layouts/alwaysOnNext.js'
import { createAlwaysOnFocusLayout } from '../src/layouts/alwaysOnFocus.js'
import { createBuzzer } from '../src/components/buzzer.js'

// Each: makes the frame's base now, and returns how to make each layout (on first show)
function createScreenOnLayouts() {
  const frame = createFrame()
  return {
    clear: () => frame.layout(createClearLayout),
    next: () => frame.layout(createNextLayout),
    focus: () => frame.layout(createFocusLayout),
  }
}

function createAlwaysOnLayouts(is24) {
  const frame = createAlwaysOnFrame(is24)
  return {
    clear: () => createAlwaysOnClearLayout(frame),
    next: () => createAlwaysOnNextLayout(frame),
    focus: () => createAlwaysOnFocusLayout(frame),
  }
}

// One widget set at its level ('normal' | 'alwaysOn'), showing the layout the state asks for.
// A layout is made the first time it's shown and kept; new widgets show by themselves, so only a
// switch between layouts changes what's visible. Its error text is at the same level, so it shows
// in the scene this set is for.
function createSet(level, createLayouts) {
  const makers = withWidgetLevel(level, createLayouts)
  const layouts = {}
  let current = null
  let error = null

  const draw = (state) => {
    let layout = layouts[state.layout]
    if (!layout || layout !== current) {
      const switching = !!current
      if (switching) current.setVisible(false)
      if (!layout) layout = layouts[state.layout] = makers[state.layout]()
      // Current before it's drawn: one that fails halfway is still hidden on the next switch
      current = layout
      // A kept layout, or frame parts the last one hid (a first layout is all visible already)
      if (switching) layout.setVisible(true)
    }
    layout.render(state)
  }

  return {
    show(state) {
      // Widgets made while drawing (a layout, a frame part, a clock) are at this set's level too
      withWidgetLevel(level, () => draw(state))
      if (error) setVisible(error, false)
    },
    // Never leave a blank face: show what went wrong
    showError(e) {
      if (!error) {
        error = withWidgetLevel(level, () =>
          text({ x: 30, y: 180, w: 330, h: 90, text_size: 18, color: C.alert, text_style: ui.text_style.WRAP }))
      }
      setText(error, 'Today On Rails: ' + e)
      setVisible(error, true)
    },
  }
}

function readScene() {
  try {
    return getScene()
  } catch (e) {
    return undefined // unknown: build both sets
  }
}

WatchFace({
  build() {
    const sensors = createSensors()
    const buzzer = createBuzzer()
    const sets = {}

    // Creates the sets the current scene needs and this instance doesn't have yet → true if any.
    // Later than build only if a dimmed instance is ever shown lit without a rebuild: then the
    // normal set appears on the next refresh (wake or minute) instead of the screen staying empty.
    const addSets = () => {
      const need = setsForScene(readScene(), SCENE_AOD)
      const before = Object.keys(sets).length
      if (need.normal && !sets.normal) {
        addScreenOnSensors(sensors)
        sets.normal = createSet('normal', createScreenOnLayouts)
        // A new background heart-rate reading: show it right away (no extra sensor use). Only the
        // lit screen shows it, so a dimmed instance doesn't listen.
        sensors.heart.onLastChange(refresh)
      }
      if (need.alwaysOn && !sets.alwaysOn) {
        sets.alwaysOn = createSet('alwaysOn', () => createAlwaysOnLayouts(is24h(sensors.time)))
      }
      return Object.keys(sets).length > before
    }
    const showError = (e) => Object.values(sets).forEach((set) => set.showError(e))

    let lastKey = null
    const refresh = () => {
      if (addSets()) lastKey = null // a new set has nothing on it yet
      let state
      try {
        const inputs = readInputs(sensors)
        const key = refreshKey(inputs) // when dimmed: without battery, heart and steps (not read)
        if (key === lastKey) return // the screen already shows this
        lastKey = key
        state = readState(inputs, sensors)
      } catch (e) {
        lastKey = null
        return showError(e)
      }
      // Buzz at the moments chosen on the phone, before drawing so the buzz is on time
      try {
        buzzer.check(state)
      } catch (e) {
        // no vibration this time: the face still draws (an error text would be hidden by the draw anyway)
      }
      // Each set on its own: a problem in one never blanks the other
      Object.values(sets).forEach((set) => {
        try {
          set.show(state)
        } catch (e) {
          set.showError(e)
        }
      })
    }

    refresh()
    sensors.time.onPerMinute(refresh)
    // Wake: catch up if a minute passed while paused (right after build the key matches: no work).
    // No pause_call: the watch rebuilds the face as it dims, so drawing on pause would be thrown
    // away — and it ran right in the lit → dim transition that lagged.
    ui.createWidget(ui.widget.WIDGET_DELEGATE, { resume_call: refresh })
  },

  onDestroy() {},
})
