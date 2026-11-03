// Test build: replaces watchface/src/data/agendaSource.js in the build copy (tools/build.sh <test>).
// The agenda text comes from the test (testBuild/build.js → tools/test-builds/<test>.js), computed on
// the watch from its own clock each minute, instead of from the phone.
import { minuteOf } from './agenda.js'
import { load, save } from './saved.js'
import { BUILD, agendaText } from '../testBuild/build.js'

// Tests are laid out from their first run (about when they were installed). Kept in storage: the face
// is rebuilt on every lit/dim switch. The key has the build's id, so each new install starts afresh.
const FIRST_RUN = 'firstRun-' + BUILD
let firstRun = 0

export function readAgendaText(now) {
  const minute = minuteOf(now)
  if (!firstRun) firstRun = Number(load(FIRST_RUN)) || 0
  if (!firstRun) {
    firstRun = minute
    save(FIRST_RUN, String(minute))
  }
  return agendaText(minute, firstRun)
}
