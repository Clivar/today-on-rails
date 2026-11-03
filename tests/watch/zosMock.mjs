// A stand-in for the watch's @zos modules, so the real watchface entry (watchface/watchface/index.js)
// runs in Node and every call it makes to the watch is counted: widgets created, setProperty calls,
// sensor and storage calls. Used by buildCost.test.mjs.
//
// installZosMock() registers module hooks in this process (no fake packages in node_modules):
// `import ui from '@zos/ui'` then gets this file's `ui`, and so on for app, sensor, storage, router.
// One mock per process (node --test runs each test file in its own process).
import module from 'node:module'

export const SCENE_LIT = 1 // getScene() on the Bip 6: 1 while lit, 3 while dimmed
export const SCENE_AOD = 3

const DAY = 1440

// Any key → its name: ui.widget.TEXT === 'TEXT', ui.prop.VISIBLE === 'VISIBLE' …
const names = () => new Proxy({}, { get: (_, k) => (typeof k === 'string' ? k : undefined) })

function createMock() {
  const state = {
    minute: 0, // absolute local minute (minuteOf), the watch's clock
    scene: SCENE_LIT,
    agenda: '', // the weather location name: the agenda text
    battery: 80,
    heart: 62,
    steps: 4210,
    storage: new Map(),
  }
  let stats
  let listeners
  let widgets

  const reset = () => {
    stats = { widgets: {}, levels: {}, set: {}, setByType: {}, calls: {}, storage: {} }
    return stats
  }
  reset()
  const bump = (bag, key, by = 1) => (bag[key] = (bag[key] || 0) + by)
  const call = (name) => bump(stats.calls, name)

  // ── @zos/ui ──
  const ui = {
    widget: names(), prop: names(), align: names(), text_style: names(), data_type: names(), show_level: names(),
    createWidget(type, props = {}) {
      if (typeof type !== 'string') throw new Error('createWidget: unknown widget type ' + String(type))
      bump(stats.widgets, type)
      bump(stats.levels, props.show_level || 'unflagged')
      const w = {
        type, props: { ...props },
        setProperty(prop, value) {
          if (typeof prop !== 'string') throw new Error('setProperty: unknown prop ' + String(prop))
          bump(stats.set, prop)
          bump(stats.setByType, type)
          if (prop === 'MORE') Object.assign(w.props, value)
          else w.props[prop.toLowerCase()] = value
        },
        getProperty: (prop) => w.props[String(prop).toLowerCase()],
      }
      widgets.push(w)
      return w
    },
  }

  // ── @zos/sensor ──
  const clock = () => {
    const d = new Date(state.minute * 60000)
    return { d, hours: d.getUTCHours(), minutes: d.getUTCMinutes() }
  }
  const counted = (cls, methods) => {
    for (const [name, fn] of Object.entries(methods)) {
      cls.prototype[name] = function (...args) {
        call(`${cls.name}.${name}`)
        return fn.apply(this, args)
      }
    }
    return cls
  }
  const construct = (name) => call(`new ${name}`)
  const Time = counted(class Time { constructor() { construct('Time') } }, {
    getFullYear: () => clock().d.getUTCFullYear(),
    getMonth: () => clock().d.getUTCMonth() + 1, // 1 … 12 on the watch
    getDate: () => clock().d.getUTCDate(),
    getHours: () => clock().hours,
    getMinutes: () => clock().minutes,
    getSeconds: () => 0,
    getDay: () => clock().d.getUTCDay() || 7, // 1 = Monday … 7 = Sunday
    getHourFormat: () => 1, // TIME_HOUR_FORMAT_24
    getTime: () => state.minute * 60000,
    onPerMinute: (cb) => listeners.minute.push(cb),
  })
  const Battery = counted(class Battery { constructor() { construct('Battery') } }, { getCurrent: () => state.battery })
  const HeartRate = counted(class HeartRate { constructor() { construct('HeartRate') } }, {
    getLast: () => state.heart,
    getResting: () => 58,
    // One value per minute since midnight; the last reading 2 minutes ago
    getToday: () => {
      const { hours, minutes } = clock()
      const today = new Array(hours * 60 + minutes + 1).fill(0)
      if (today.length > 2) today[today.length - 3] = state.heart
      return today
    },
    onLastChange: (cb) => listeners.heart.push(cb),
  })
  const Step = counted(class Step { constructor() { construct('Step') } }, { getCurrent: () => state.steps })
  const Weather = counted(class Weather { constructor() { construct('Weather') } }, {
    getForecast: () => ({ cityName: state.agenda, forecastData: { count: 0, data: [] } }),
  })
  const Vibrator = counted(class Vibrator { constructor() { construct('Vibrator') } }, { start: () => {}, stop: () => {} })

  const modules = {
    ui: { default: ui },
    app: { getScene: () => (call('getScene'), state.scene), SCENE_AOD },
    sensor: {
      Time, Battery, HeartRate, Step, Weather, Vibrator,
      TIME_HOUR_FORMAT_24: 1, TIME_HOUR_FORMAT_12: 0, VIBRATOR_SCENE_NOTIFICATION: 'NOTIFICATION',
    },
    storage: {
      localStorage: {
        getItem: (key, fallback) => (bump(stats.storage, 'getItem'), state.storage.has(key) ? state.storage.get(key) : fallback),
        setItem: (key, value) => (bump(stats.storage, 'setItem'), state.storage.set(key, value)),
        removeItem: (key) => (bump(stats.storage, 'removeItem'), state.storage.delete(key)),
      },
    },
    router: { launchApp: () => {}, SYSTEM_APP_VOICE_MEMO: 'VOICE_MEMO' },
  }

  // A new face instance (the watch rebuilds the face on every lit ↔ dim switch): new widgets and
  // listeners; storage stays.
  const newInstance = () => {
    listeners = { minute: [], heart: [] }
    widgets = []
  }
  newInstance()

  return {
    state, modules, reset, newInstance,
    get stats() { return stats },
    get widgets() { return widgets },
    // Fire what the watch would: the minute tick, a heart reading, the wake (the WIDGET_DELEGATE's resume_call)
    tick() {
      state.minute++
      listeners.minute.forEach((cb) => cb())
    },
    heartReading(value = state.heart) {
      state.heart = value
      listeners.heart.forEach((cb) => cb())
    },
    resume() {
      widgets.filter((w) => w.type === 'WIDGET_DELEGATE').forEach((w) => w.props.resume_call && w.props.resume_call())
    },
    DAY,
  }
}

let installed = null

export function installZosMock() {
  if (installed) return installed
  const mock = createMock()
  globalThis.__zosMock = mock
  const exportsOf = Object.fromEntries(
    Object.entries(mock.modules).map(([name, m]) => [name, Object.keys(m).filter((k) => k !== 'default')]))
  const PREFIX = 'zos-mock:'
  const source = (name) => {
    const keys = exportsOf[name]
    if (!keys) throw new Error(`zosMock: no mock for @zos/${name}`)
    return `const m = globalThis.__zosMock.modules[${JSON.stringify(name)}];\n` +
      'export default m.default;\n' +
      (keys.length ? `export const { ${keys.join(', ')} } = m;\n` : '')
  }
  module.registerHooks({
    resolve(specifier, context, next) {
      if (specifier.startsWith('@zos/')) return { url: PREFIX + specifier.slice(5), shortCircuit: true }
      return next(specifier, context)
    },
    load(url, context, next) {
      if (url.startsWith(PREFIX)) return { format: 'module', source: source(url.slice(PREFIX.length)), shortCircuit: true }
      return next(url, context)
    },
  })
  installed = mock
  return mock
}
