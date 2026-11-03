// Vibrates when a moment is due (data/buzzes.js): an event starting, 5 minutes left, get ready.
// Called from the minute tick that refreshes the face anyway: no timers of its own.
// Can't buzz twice for one moment: the minute of the last buzz is kept in storage, and the face is
// rebuilt (memory wiped) on every lit/dim switch, so a rebuild in the same minute finds it there.
// (The older 'buzzed' storage key, a list of moment names, is no longer read.)
import { Vibrator, VIBRATOR_SCENE_NOTIFICATION } from '@zos/sensor'
import { minuteOf } from '../data/agenda.js'
import { dueBuzz } from '../data/buzzes.js'
import { load, save } from '../data/saved.js'

const LAST_BUZZ = 'lastBuzz' // storage key: absolute minute (minuteOf) of the last buzz

export function createBuzzer() {
  let vibrator = null

  return {
    check(state) {
      const now = minuteOf(state.now)
      if (!dueBuzz(state.agenda, now, () => Number(load(LAST_BUZZ)) || 0)) return
      // Remember first: if vibrating fails it must not retry on every rebuild
      save(LAST_BUZZ, String(now))
      if (!vibrator) vibrator = new Vibrator()
      vibrator.start({ mode: VIBRATOR_SCENE_NOTIFICATION })
    },
  }
}
