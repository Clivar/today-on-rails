// Everything the screens need, read once per refresh into one plain object.
import { Time, Battery, HeartRate, Step, Weather, TIME_HOUR_FORMAT_24 } from '@zos/sensor'

import { parseAgenda, chooseLayout } from './agenda.js'
import { DEMOS } from './demos.js'
import { DEMO } from './demo-name.js'

// Fixed data for screenshots (tools/build.sh <demo>), or null for the real watch
export const demo = DEMO ? DEMOS[DEMO] : null

export function createSensors() {
  return { time: new Time(), battery: new Battery(), heart: new HeartRate(), steps: new Step() }
}

// Demos of the always-on layouts show them on the normal screen instead
export function isAlwaysOnDemo() {
  return !!(demo && demo.alwaysOn)
}

// Alignment check: both clocks at once (real time), to see the always-on digits sit on the normal ones
export function isAlignDemo() {
  return !!(demo && demo.align)
}

export function is24h(time) {
  if (demo && demo.is24 !== undefined) return demo.is24
  try {
    return time.getHourFormat() === TIME_HOUR_FORMAT_24
  } catch (e) {
    return false
  }
}

function readNow(time) {
  if (demo && demo.now) return demo.now
  return {
    year: time.getFullYear(), month: time.getMonth(), day: time.getDate(),
    hours: time.getHours(), minutes: time.getMinutes(), weekDay: time.getDay() % 7, // getDay: 1 = Monday … 7 = Sunday
  }
}

// The agenda travels in the weather location name (see data/agenda.js)
function readCityName(now) {
  if (demo && typeof demo.cityName === 'function') return demo.cityName(now)
  if (demo && demo.cityName !== undefined) return demo.cityName
  try {
    return (new Weather().getForecast() || {}).cityName || ''
  } catch (e) {
    return ''
  }
}

// Heart rate without extra sensor use: the watch's own background readings (their interval is set in
// Gadgetbridge → Heart rate monitoring). A reading counts as fresh for 10 minutes; after that the
// face shows the resting heart rate instead, greyed, so an old value never looks live.
const HEART_FRESH_MIN = 10

function readHeart(sensor, now) {
  if (demo && demo.heart !== undefined) return { value: demo.heart, fresh: true }
  const last = sensor.getLast()
  let age = Infinity
  try {
    // One value per minute since midnight; the last non-zero one is the latest reading
    const today = sensor.getToday() || []
    for (let i = today.length - 1; i >= 0; i--) {
      if (today[i] > 0) {
        age = now.hours * 60 + now.minutes - i
        break
      }
    }
  } catch (e) {
    age = Infinity
  }
  if (last > 0 && age <= HEART_FRESH_MIN) return { value: last, fresh: true }
  let resting = 0
  try {
    resting = sensor.getResting()
  } catch (e) {
    resting = 0
  }
  return { value: resting > 0 ? resting : last, fresh: false }
}

export function readState(sensors) {
  const now = readNow(sensors.time)
  const agenda = parseAgenda(readCityName(now), now)
  const { layout, subject, ready } = chooseLayout(agenda)
  return {
    now,
    is24: is24h(sensors.time),
    agenda,
    layout, // 'clear' | 'next' | 'focus' (the Today card)
    subject, // the event the layout is about (ongoing or upcoming), or the next one
    ready: !!ready, // the "get ready" Today card (an event with a place)
    weather: agenda.weather,
    battery: demo && demo.battery !== undefined ? demo.battery : sensors.battery.getCurrent(),
    heart: readHeart(sensors.heart, now), // { value, fresh }
    steps: demo && demo.steps !== undefined ? demo.steps : sensors.steps.getCurrent(),
  }
}
