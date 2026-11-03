// perf test build: stands in for '@zos/ui' in the face's own files (tools/test-builds/perf/instrument.mjs
// rewrites their imports). The same ui, except that createWidget is counted and timed and returns the
// widget wrapped so its setProperty calls are counted and timed too.
// Zepp OS API objects are proxies (touching their prototypes throws "proxy: inconsistent get"), so
// nothing of theirs is patched: this is a plain object with a getter per key the face uses (uiKeys.js,
// written by instrument.mjs from the face's source).
import realUi from '@zos/ui'
import { UI_KEYS } from './uiKeys.js'
import { count, since } from './perf.js'

// A wrapped widget passed back to the ui (e.g. deleteWidget) must go as the real one
const unwrap = (w) => (w && w.__perfReal) || w

function wrap(w) {
  if (!w || typeof w !== 'object') return w
  return {
    __perfReal: w,
    setProperty(prop, value) {
      const t0 = Date.now()
      try {
        return w.setProperty(prop, value)
      } finally {
        count.setMs += since(t0)
        count.set++
      }
    },
    getProperty: (...args) => w.getProperty(...args),
    addEventListener: (...args) => w.addEventListener(...args),
    removeEventListener: (...args) => w.removeEventListener(...args),
  }
}

function createWidget(type, props) {
  const t0 = Date.now()
  try {
    return wrap(realUi.createWidget(type, props))
  } finally {
    count.createMs += since(t0)
    count.widgets++
    if (props && props.show_level === realUi.show_level.ONAL_AOD) count.aod++
  }
}

const ui = {}
UI_KEYS.forEach((key) => {
  Object.defineProperty(ui, key, {
    enumerable: true,
    get() {
      if (key === 'createWidget') return createWidget
      const value = realUi[key]
      return typeof value === 'function' ? (...args) => realUi[key](...args.map(unwrap)) : value
    },
  })
})

export default ui
