// Everything the screens need, per refresh: the raw readings (readInputs), then one plain object
// for the screens (readState).
import { Time, Battery, HeartRate, Step, TIME_HOUR_FORMAT_24 } from '@zos/sensor'

import { parseAgenda, chooseLayout } from './agenda.js'
import { readAgendaText } from './agendaSource.js'

// Battery, heart rate and steps show only on the lit screen: their sensors are made with the normal
// widget set (addScreenOnSensors), so a dimmed instance never makes or reads them.
export function createSensors() {
  return { time: new Time(), battery: null, heart: null, steps: null }
}

export function addScreenOnSensors(sensors) {
  sensors.battery = new Battery()
  sensors.heart = new HeartRate()
  sensors.steps = new Step()
}

export function is24h(time) {
  try {
    return time.getHourFormat() === TIME_HOUR_FORMAT_24
  } catch (e) {
    return false
  }
}

function readNow(time) {
  return {
    year: time.getFullYear(), month: time.getMonth(), day: time.getDate(),
    hours: time.getHours(), minutes: time.getMinutes(), weekDay: time.getDay() % 7, // getDay: 1 = Monday … 7 = Sunday
  }
}

// Heart rate without extra sensor use: the watch's own background readings (their interval is set in
// Gadgetbridge → Heart rate monitoring). A reading counts as fresh for 10 minutes; after that the
// face shows the resting heart rate instead, greyed, so an old value never looks live.
const HEART_FRESH_MIN = 10

function readHeart(sensor, last, now) {
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

// The raw readings, cheap to take: data/refresh.js compares them to skip a refresh with nothing new.
// lit: the screen-on sensors are there (addScreenOnSensors); without them battery, heart and steps stay 0.
export function readInputs(sensors) {
  const now = readNow(sensors.time)
  const inputs = { now, is24: is24h(sensors.time), lit: !!sensors.heart, battery: 0, heartLast: 0, steps: 0, cityName: '' }
  if (inputs.lit) {
    inputs.battery = sensors.battery.getCurrent()
    inputs.heartLast = sensors.heart.getLast()
    inputs.steps = sensors.steps.getCurrent()
  }
  inputs.cityName = readAgendaText(now)
  return inputs
}

// The readings → what the screens show
export function readState(inputs, sensors) {
  const { now } = inputs
  const agenda = parseAgenda(inputs.cityName, now)
  const { layout, subject, ready } = chooseLayout(agenda)
  return {
    now,
    is24: inputs.is24,
    agenda,
    layout, // 'clear' | 'next' | 'focus' (the Today card)
    subject, // the event the layout is about (ongoing or upcoming), or the next one
    ready: !!ready, // the "get ready" Today card (an event with a place)
    weather: agenda.weather,
    battery: inputs.battery,
    // Freshness needs today's per-minute list: read only when the lit screen is redrawn
    heart: inputs.lit ? readHeart(sensors.heart, inputs.heartLast, now) : null, // { value, fresh }
    steps: inputs.steps,
  }
}
