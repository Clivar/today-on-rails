// The two screens of the watchface:
//   'lit'  the wrist is raised: the full face (layouts/lit/)
//   'dim'  always-on: a still, dimmed version (layouts/dim/); only while the watch is worn
// Every widget belongs to one screen and shows only on it (lit: ONLY_NORMAL, dim: ONAL_AOD — an
// unflagged widget would show on both and cover the dim screen).
//
// The watch rebuilds the face on every switch between them (and after the screen was off), so each
// face instance is made for the screen the watch shows right now (currentScreen, and which screens
// to build: data/refresh.js screensToBuild).
import ui from '@zos/ui'
import { getScene, SCENE_AOD } from '@zos/app'
import { C } from './theme.js'
import { Widget, textProps } from './widgets.js'
import { screenFromScene } from '../data/refresh.js'

// 'lit' | 'dim' | null (unknown)
export function currentScreen() {
  try {
    return screenFromScene(getScene(), SCENE_AOD)
  } catch (e) {
    return null
  }
}

// A screen: name 'lit' | 'dim'. createLayouts(screen) → { clear, next, focus }, each a get() that
// makes the layout the first time (ui/lazy.js). A layout: { render(state), setVisible(on) }.
// → screen: widget(type, props) / text(props) make a Widget on this screen; show(state) draws the
// layout the state asks for; showError(e) shows what went wrong instead of a blank face.
export function createScreen(name, createLayouts) {
  const show_level = name === 'dim' ? ui.show_level.ONAL_AOD : ui.show_level.ONLY_NORMAL
  const widget = (type, props) => {
    props.show_level = show_level
    return new Widget(ui.createWidget(type, props), props)
  }
  const text = (props) => widget(ui.widget.TEXT, textProps(props))

  const screen = { name, widget, text, show, showError }
  const layouts = createLayouts(screen)
  let shown = null // the get() of the layout on screen
  let error = null

  function show(state) {
    const layout = layouts[state.layout]
    if (layout !== shown) {
      if (shown) shown().setVisible(false)
      // Before it's drawn: one that fails halfway is still hidden on the next switch
      shown = layout
      // A new layout shows by itself (no write); a kept one, or frame parts the last one hid, show again
      layout().setVisible(true)
    }
    layout().render(state)
    if (error) error.show(false)
  }

  function showError(e) {
    if (!error) error = text({ x: 30, y: 180, w: 330, h: 90, text_size: 18, color: C.alert, text_style: ui.text_style.WRAP })
    error.setText('Today On Rails: ' + e)
    error.show(true)
  }

  return screen
}
