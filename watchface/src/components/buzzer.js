// Vibrates once for each due moment (data/buzzes.js): an event starting, 5 minutes left, get ready.
// Runs on the minute tick that refreshes the face anyway — no extra timers, one short buzz a time.
import { Vibrator, VIBRATOR_SCENE_NOTIFICATION } from '@zos/sensor'
import { dueBuzz } from '../data/buzzes.js'
import { demo } from '../data/state.js'

export function createBuzzer() {
  let vibrator = null
  const done = [] // keys of moments already buzzed (the last few)

  return {
    check(state) {
      if (demo && !demo.buzz) return // demos stay quiet unless they test this
      const due = dueBuzz(state.agenda)
      if (!due || done.includes(due.key)) return
      done.push(due.key)
      if (done.length > 10) done.shift()
      try {
        if (!vibrator) vibrator = new Vibrator()
        vibrator.start({ mode: VIBRATOR_SCENE_NOTIFICATION })
      } catch (e) {
        // no vibration available
      }
    },
  }
}
