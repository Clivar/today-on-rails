// Where the agenda text comes from: the weather location name, which the phone app sets through
// Gadgetbridge (format: data/agenda.js). On its own so tools/build.sh can build the face with
// another source; `now` is for such a source, this one doesn't need it.
import { Weather } from '@zos/sensor'

export function readAgendaText(now) {
  try {
    return (new Weather().getForecast() || {}).cityName || ''
  } catch (e) {
    return ''
  }
}
