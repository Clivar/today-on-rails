// Renders the watchface's images to PNG with headless Chromium, into build/assets/images/
// (tools/build.sh copies them into the watchface): icons from the design boards, the always-on
// digits, the temperature digits, the record button and the preview.
// Usage: node tools/gen-assets.mjs
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { METRICS } from '../watchface/src/ui/metrics.js'
import { slotWidth, colonWidth } from '../watchface/src/ui/clockSlots.js'
import { CLOCK_SIZES, AMPM_SIZE } from '../watchface/src/ui/clockSizes.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'build', 'assets', 'images')
const TMP = path.join(ROOT, 'build', 'tmp')
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(TMP, { recursive: true })

const MUTED = '#9EA39A'
const TEXT = '#F3F5EF'
const LIME = '#B6F35A'
const ON_LIME = '#0A0D05'
const AOD_DIGITS = '#A3A89F'
const AOD_LIME = '#7FA83F'
const AOD_MUTED = '#767A73'

// One HTML snippet → one PNG of w x h with a transparent background
function shoot(name, w, h, html) {
  const file = path.join(TMP, name.replace(/\//g, '_') + '.html')
  fs.writeFileSync(file, `<!doctype html><html><head><style>
    @font-face { font-family: BC; src: url('file://${ROOT}/fonts/BarlowCondensed-SemiBold.ttf'); }
    @font-face { font-family: B; font-weight: 600; src: url('file://${ROOT}/fonts/Barlow-SemiBold.ttf'); }
    html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
  </style></head><body>${html}</body></html>`)
  const png = path.join(OUT, name + '.png')
  fs.mkdirSync(path.dirname(png), { recursive: true })
  execFileSync('chromium', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--default-background-color=00000000',
    `--window-size=${w},${h}`, '--virtual-time-budget=1500', `--screenshot=${png}`, 'file://' + file,
  ], { stdio: 'ignore' })
}

// A glyph centred in a box of w px, baseline at 1.0em in a 1.2em-high box — the same box model as
// the TEXT widgets on the watch, so images and text line up
function glyph(name, ch, family, size, w, style) {
  const line = Math.round(size * 1.2)
  shoot(name, w, line, `<div style="font: 600 ${size}px/${line}px ${family}; width:${w}px; height:${line}px; text-align:center; ${style}">${ch}</div>`)
}

// ── Icons (SVG from the design boards) ─────────────────────────────────────────

const svg = (size, stroke, width, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`

const ICONS = {
  weather: '<circle cx="9" cy="9" r="3.5"/><path d="M9 2.5v1.5M3.5 9H2M4.4 4.4l1 1M13.6 4.4l-1 1"/><path d="M8 20h9a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.5A3.3 3.3 0 0 0 8 20z"/>',
  heart: '<path d="M3 12h4l2.5-6 4 12 2.5-6h5"/>',
  steps: '<ellipse cx="8" cy="8.5" rx="3" ry="4.5"/><ellipse cx="16" cy="13.5" rx="3" ry="4.5"/><path d="M6.5 16.5h3M14.5 21.5h3"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/>',
}
for (const [name, icon, size] of [
  ['weather-21', 'weather', 21], ['weather-22', 'weather', 22],
  ['heart-21', 'heart', 21], ['heart-22', 'heart', 22], ['steps-21', 'steps', 21],
]) shoot(name, size, size, svg(size, MUTED, 2, ICONS[icon]))

// Record button: lime circle with the mic, plus a pressed state
const recButton = (fill) =>
  `<div style="width:56px;height:56px;border-radius:50%;background:${fill};display:flex;align-items:center;justify-content:center">${svg(26, ON_LIME, 2.2, ICONS.mic)}</div>`
shoot('rec', 56, 56, recButton(LIME))
shoot('rec-pressed', 56, 56, recButton('#8FC444'))

// ── Always-on clocks (system-drawn IMG_TIME): one image set per clock ───────────
// Digits in fixed-width slots (watchface/src/ui/clockSlots.js), exactly like the normal clocks.

for (const size of CLOCK_SIZES) {
  // Big clocks: outlined Barlow Condensed SemiBold, 2px stroke; dim lime colon
  for (const d of '0123456789') {
    glyph(`aod${size}/d${d}`, d, 'BC', size, slotWidth('digits', size), `color: transparent; -webkit-text-stroke: 2px ${AOD_DIGITS};`)
  }
  glyph(`aod${size}/colon`, ':', 'BC', size, colonWidth('digits', size), `color: ${AOD_LIME};`)
}
// The Today card's small clock: Barlow SemiBold 26px in dim grey
for (const ch of '0123456789:') {
  const w = ch === ':' ? colonWidth('semibold', 26) : slotWidth('semibold', 26)
  glyph(`aodsmall/${ch === ':' ? 'colon' : 'd' + ch}`, ch, 'B', 26, w, `color: ${AOD_MUTED};`)
}
// AM/PM for the big clocks
for (const s of ['AM', 'PM']) {
  glyph(`aodampm/${s.toLowerCase()}`, s, 'B', AMPM_SIZE, Math.round((METRICS.semibold.widths[s[0]] + METRICS.semibold.widths[s[1]]) * AMPM_SIZE), `color: ${AOD_MUTED};`)
}

// ── Current temperature (system data widget TEXT_IMG): digits, minus, degree ────

for (const size of [21, 22]) {
  const one = (name, ch) => glyph(`temp${size}/${name}`, ch, 'B', size, Math.max(1, Math.round(METRICS.semibold.widths[ch] * size)), `color: ${TEXT};`)
  for (const d of '0123456789') one(`d${d}`, d)
  one('minus', '-')
  one('degree', '°')
  glyph(`temp${size}/invalid`, '--', 'B', size, Math.round(size * 1.1), `color: ${TEXT};`)
}

// ── Preview (shown in Gadgetbridge and the watch's watchface list) ──────────────
// A real watch screenshot of the "clear" layout if there is one, else the design board

const shot = path.join(ROOT, 'screenshots', '01-clear.png')
const previewBg = fs.existsSync(shot)
  ? `url('file://${shot}') 0 0`
  : `url('file://${ROOT}/design/01-watchface-nothing-soon.png') -78px -75px`
shoot('preview', 390, 450, `<div style="width:390px;height:450px;border-radius:86px;overflow:hidden;background:${previewBg}"></div>`)

fs.rmSync(TMP, { recursive: true, force: true })
const count = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1), 0)
console.log('assets:', count(OUT))
