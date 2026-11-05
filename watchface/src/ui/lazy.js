// Made the first time they're needed — the face's one cache for creating widgets. The watch rebuilds
// the face on every wake and every switch between lit and dim, and creating a widget costs about
// 4 ms, so an instance should make only what it shows (a layout it never shows is never made).
//
// Widgets stack in creation order: whatever is made later lies on top. Where that matters, the code
// that uses these says how it keeps the order (layouts/lit/frame.js, components/rail.js).

// lazy(make) → get(): make()'s value, made on the first get() and kept
export function lazy(make) {
  let value
  let made = false
  return () => {
    if (!made) {
      value = make()
      made = true
    }
    return value
  }
}

// A pool of like widgets, for things that come in varying numbers (the rail's dots and arc pieces).
// make(item) creates one, already showing item, and returns its draw(item), which shows it with
// item's props or hides it when item is null.
// → draw(items, restack): one widget per item, the rest hidden, more made when needed. restack: hide
// them all and start over (made again on top of what was made since). Returns whether it made any.
export function pool(make) {
  let units = []
  return (items, restack) => {
    if (restack) {
      for (let i = 0; i < units.length; i++) units[i](null)
      units = []
    }
    for (let i = 0; i < units.length; i++) units[i](i < items.length ? items[i] : null)
    if (items.length <= units.length) return false
    for (let i = units.length; i < items.length; i++) units.push(make(items[i]))
    return true
  }
}
