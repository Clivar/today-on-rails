// Small strings that outlive the face itself: the watch rebuilds the watchface on every switch between
// lit and dim, which wipes everything kept in memory. Stored on the watch, cleared when the face is removed.
import { localStorage } from '@zos/storage'

export function load(key, fallback = '') {
  try {
    const value = localStorage.getItem(key, fallback)
    return typeof value === 'string' ? value : fallback
  } catch (e) {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch (e) {
    // no storage: the face still works, it just forgets on a rebuild
  }
}
