// perf test build: adds the measuring to the build copy (tools/build.sh perf runs this on build/test-perf).
//   node tools/test-builds/perf/instrument.mjs <build copy>
// - copies device/ (perf.js, zosUi.js) to src/testBuild/perf/ and writes uiKeys.js;
// - points every `import ui from '@zos/ui'` of the face's own files at zosUi.js (counted widgets and
//   setProperty calls);
// - in watchface/index.js: WatchFace({…}) → WatchFace(perf.wrap({…})) (build() timed), and each refresh
//   (the first one in build, the minute tick, the heart reading, the wake) wrapped in perf.timed(...).
// Every rewrite must match exactly as often as expected, or the build stops: when index.js changes,
// this script is updated with it instead of measuring something else.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const copy = process.argv[2]
if (!copy || !fs.existsSync(path.join(copy, 'app.json'))) {
  console.error('usage: instrument.mjs <build copy of watchface/>')
  process.exit(1)
}
const here = path.dirname(fileURLToPath(import.meta.url))
// PERF_COUNT=0: no per-call counting (widget wrapper, textWidth span) — each counted call adds two
// Date.now() calls, which inflates the times; then only build, refreshes and their main spans are timed
const COUNT = process.env.PERF_COUNT !== '0'
const dest = path.join(copy, 'src/testBuild/perf')
const entry = path.join(copy, 'watchface/index.js')

const fail = (message) => {
  console.error(`instrument.mjs: ${message}`)
  process.exit(1)
}

// The face's own files: everything but the test build's
const files = []
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (p !== path.join(copy, 'src/testBuild')) walk(p)
    } else if (e.name.endsWith('.js')) files.push(p)
  }
}
walk(path.join(copy, 'src'))
walk(path.join(copy, 'watchface'))

fs.mkdirSync(dest, { recursive: true })
for (const f of fs.readdirSync(path.join(here, 'device'))) fs.copyFileSync(path.join(here, 'device', f), path.join(dest, f))

// @zos/ui → zosUi.js, and the ui keys the face uses
const keys = new Set(['createWidget'])
let rewritten = 0
for (const file of COUNT ? files : []) {
  let src = fs.readFileSync(file, 'utf8')
  if (!src.includes('@zos/ui')) continue
  const imports = src.match(/^import .* from '@zos\/ui'$/gm) || []
  if (imports.length !== 1 || imports[0] !== "import ui from '@zos/ui'") {
    fail(`${path.relative(copy, file)}: expected exactly "import ui from '@zos/ui'", found ${JSON.stringify(imports)}`)
  }
  for (const m of src.matchAll(/\bui\.([A-Za-z_$][\w$]*)/g)) keys.add(m[1])
  let rel = path.relative(path.dirname(file), path.join(dest, 'zosUi.js'))
  if (!rel.startsWith('.')) rel = './' + rel
  src = src.replace("import ui from '@zos/ui'", `import ui from '${rel}'`)
  fs.writeFileSync(file, src)
  rewritten++
}
if (COUNT && !rewritten) fail("no file imports '@zos/ui'")
fs.writeFileSync(path.join(dest, 'uiKeys.js'),
  `// Written by tools/test-builds/perf/instrument.mjs: the @zos/ui keys the face uses\nexport const UI_KEYS = ${JSON.stringify([...keys].sort())}\n`)

// index.js: time build() and every refresh
let index = fs.readFileSync(entry, 'utf8')
const rewrite = (pattern, replacement, what) => {
  const n = (index.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')) || []).length
  if (n !== 1) fail(`watchface/index.js: ${what}: expected 1 match of ${pattern}, found ${n}`)
  index = index.replace(pattern, replacement)
}
// The entry must call WatchFace itself (calling it from another module left the face blank on the
// watch), so only its options are wrapped: WatchFace(__perf.wrap({ … }))
rewrite(/^WatchFace\(\{$/m, 'WatchFace(__perf.wrap({', 'the WatchFace call')
rewrite(/^\}\)\s*$/m, '}))', 'the end of the WatchFace call')
rewrite(/^(\s+)refresh\(\)$/m, "$1__perf.timed('first', refresh)()", 'the first refresh in build')
rewrite(/\.onPerMinute\(refresh\)/, ".onPerMinute(__perf.timed('tick', refresh))", 'the minute tick')
rewrite(/\.onLastChange\(refresh\)/, ".onLastChange(__perf.timed('heart', refresh))", 'the heart reading')
rewrite(/resume_call: refresh\b/, "resume_call: __perf.timed('resume', refresh)", 'the wake')
// Where a refresh's time goes (named spans, summed per refresh; see perf.js span()):
//   in = readInputs, st = readState (incl. hr), show = both screens drawn, mkN / mkA = building the
//   lit / dim screen
rewrite(/readInputs\(sensors\)/, "__perf.span('in', () => readInputs(sensors))", 'reading the inputs')
rewrite(/readState\(inputs, sensors\)/, "__perf.span('st', () => readState(inputs, sensors))", 'readState')
rewrite(/screens\[i\]\.show\(state\)/, "__perf.span('show', () => screens[i].show(state))", 'drawing a screen')
rewrite(/createScreen\('lit', createLitLayouts\)/, "__perf.span('mkN', () => createScreen('lit', createLitLayouts))", 'building the lit screen')
rewrite(/createScreen\('dim', \(screen\) => createDimLayouts\(screen, is24h\(sensors\.time\)\)\)/,
  "__perf.span('mkA', () => createScreen('dim', (screen) => createDimLayouts(screen, is24h(sensors.time))))", 'building the dim screen')
index = "import * as __perf from '../src/testBuild/perf/perf.js'\n" + index
fs.writeFileSync(entry, index)

// Other files: hr = heart freshness (getToday + scan), tw = text measuring (every textWidth call)
const patch = (rel, pattern, replacement, what, header) => {
  const file = path.join(copy, 'src', rel)
  let src = fs.readFileSync(file, 'utf8')
  const n = (src.match(new RegExp(pattern.source, 'g')) || []).length
  if (n !== 1) fail(`src/${rel}: ${what}: expected 1 match of ${pattern}, found ${n}`)
  src = src.replace(pattern, replacement)
  const perfPath = path.relative(path.dirname(file), path.join(dest, 'perf.js'))
  fs.writeFileSync(file, `import * as __perf from '${perfPath.startsWith('.') ? perfPath : './' + perfPath}'\n` + src + (header || ''))
}
patch('data/state.js', /readHeart\(sensors\.heart, inputs\.heartLast, now\)/,
  "__perf.span('hr', () => readHeart(sensors.heart, inputs.heartLast, now))", 'the heart freshness')
if (COUNT) patch('ui/text.js', /export function textWidth\(/, 'function __textWidth(', 'textWidth',
  "\nexport function textWidth(...args) {\n  return __perf.span('tw', () => __textWidth(...args))\n}\n")

console.log(`perf${COUNT ? '' : ' (PERF_COUNT=0: no per-call counting)'}: ${rewritten} files use the counting ui (${keys.size} keys), index.js timed`)
