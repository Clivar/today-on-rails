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
// Both sets are built once. The always-on widgets are flagged so the watch shows them only while
// dimmed (and the normal ones only while lit). The watchface's code doesn't run while dimmed, so
// both sets are refreshed together every minute, on wake, and one last time as the screen dims:
// the dim screen then matches what you'll see when you look at the watch.
import ui from '@zos/ui'
import { getScene } from '@zos/app'

import { C } from '../src/ui/theme.js'
import { text, setWidgetLevel } from '../src/ui/widgets.js'
import { createSensors, readState, isAlwaysOnDemo, isAlignDemo, is24h, demo as demoData } from '../src/data/state.js'
import { createFrame } from '../src/layouts/frame.js'
import { createClearLayout } from '../src/layouts/clear.js'
import { createNextLayout } from '../src/layouts/next.js'
import { createFocusLayout } from '../src/layouts/focus.js'
import { createAlwaysOnFrame } from '../src/layouts/alwaysOnFrame.js'
import { createAlwaysOnClearLayout } from '../src/layouts/alwaysOnClear.js'
import { createAlwaysOnNextLayout } from '../src/layouts/alwaysOnNext.js'
import { createAlwaysOnFocusLayout } from '../src/layouts/alwaysOnFocus.js'
import { createBuzzer } from '../src/components/buzzer.js'

function createScreenOnLayouts() {
  setWidgetLevel('normal')
  const frame = createFrame()
  return { clear: createClearLayout(frame), next: createNextLayout(frame), focus: createFocusLayout(frame) }
}

function createAlwaysOnLayouts(is24, demo) {
  setWidgetLevel(demo ? 'demo' : 'alwaysOn')
  const frame = createAlwaysOnFrame(is24)
  const layouts = {
    clear: createAlwaysOnClearLayout(frame),
    next: createAlwaysOnNextLayout(frame),
    focus: createAlwaysOnFocusLayout(frame),
  }
  setWidgetLevel('normal')
  return layouts
}

// Keeps one layout of a set visible: the one the state asks for
function createSwitcher(layouts) {
  Object.values(layouts).forEach((layout) => layout.hide())
  let current = null
  return (state) => {
    const layout = layouts[state.layout]
    if (current && current !== layout) current.hide()
    layout.show(state)
    current = layout
  }
}

// Diagnostics for the dim screen (demo "aod-check"): which widget types show while dimmed, and
// whether the face is rebuilt / its code runs then. Screenshots can't capture the dim screen.
function alwaysOnCheck(sensors) {
  const L = ui.show_level.ONAL_AOD
  const hhmm = () => sensors.time.getHours() + ':' + (sensors.time.getMinutes() < 10 ? '0' : '') + sensors.time.getMinutes()
  const built = hhmm()
  let ticks = 0
  const line = ui.createWidget(ui.widget.TEXT, { x: 30, y: 330, w: 330, h: 24, text_size: 18, color: 0xffb15c, show_level: L, text: '' })
  const show = () => line.setProperty(ui.prop.TEXT, `text · scene ${getScene()} · built ${built} · ${hhmm()} #${ticks}`)
  show()
  sensors.time.onPerMinute(() => {
    ticks++
    show()
  })
  ui.createWidget(ui.widget.FILL_RECT, { x: 40, y: 372, w: 24, h: 24, radius: 4, color: 0xb6f35a, show_level: L })
  ui.createWidget(ui.widget.CIRCLE, { center_x: 96, center_y: 384, radius: 12, color: 0xffb15c, show_level: L })
  ui.createWidget(ui.widget.IMG, { x: 130, y: 356, src: 'images/rec.png', show_level: L })
}

WatchFace({
  build() {
    const sensors = createSensors()
    const demo = isAlwaysOnDemo()
    const sets = []
    if (!demo || isAlignDemo()) sets.push(createSwitcher(createScreenOnLayouts()))
    sets.push(createSwitcher(createAlwaysOnLayouts(is24h(sensors.time), demo)))

    const buzzer = createBuzzer()
    let error = null
    const showError = (e) => {
      // Never leave a blank face: show what went wrong
      if (!error) error = text({ x: 30, y: 180, w: 330, h: 90, text_size: 18, color: C.alert, text_style: ui.text_style.WRAP })
      error.setProperty(ui.prop.TEXT, 'Today On Rails: ' + e)
    }
    const refresh = () => {
      let state
      try {
        state = readState(sensors)
      } catch (e) {
        return showError(e)
      }
      // Buzz at the moments chosen on the phone (start, 5 minutes left, get ready)
      buzzer.check(state)
      // Each set on its own: a problem in one never blanks the other
      sets.forEach((show) => {
        try {
          show(state)
        } catch (e) {
          showError(e)
        }
      })
    }
    refresh()
    if (demoData && demoData.aodCheck) alwaysOnCheck(sensors)
    sensors.time.onPerMinute(refresh)
    // A new background heart-rate reading: show it right away (no extra sensor use)
    sensors.heart.onLastChange(refresh)
    ui.createWidget(ui.widget.WIDGET_DELEGATE, { resume_call: refresh, pause_call: refresh })
  },

  onDestroy() {},
})
