// No object spread ({ ...x }) in the watchface: on the Bip 6 each one costs about 3.9 ms (measured
// with tools/build.sh perf: 200 spreads took 776 ms; Object.assign 92 ms, array spread 44 ms). The
// build tool turns it into a slow helper, and the face once spent over a second of every wrist raise
// in it. Array spread and rest parameters are fine. Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = new URL('../../watchface/', import.meta.url).pathname
const files = []
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (!['node_modules', 'dist', 'assets'].includes(e.name)) walk(p)
    } else if (e.name.endsWith('.js')) files.push(p)
  }
}
walk(path.join(root, 'src'))
walk(path.join(root, 'watchface'))

// The source without comments and string contents, so only code is checked
function codeOnly(src) {
  let out = ''
  for (let i = 0; i < src.length; i++) {
    const c = src[i], d = src[i + 1]
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; out += '\n'; continue }
    if (c === '/' && d === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue }
    if (c === "'" || c === '"' || c === '`') {
      out += c
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++
      out += c
      continue
    }
    out += c
  }
  return out
}

// Is the `...` at index i inside an object literal ({ … }) rather than an array, call or parameters?
function inObject(code, i) {
  let depth = 0
  for (let j = i - 1; j >= 0; j--) {
    const c = code[j]
    if (c === ')' || c === ']' || c === '}') depth++
    else if (c === '(' || c === '[' || c === '{') {
      if (depth === 0) return c === '{'
      depth--
    }
  }
  return false
}

test('the watchface uses no object spread (3.9 ms each on the watch)', () => {
  assert.ok(files.length > 20, 'found the watchface sources')
  const hits = []
  for (const file of files) {
    const code = codeOnly(fs.readFileSync(file, 'utf8'))
    for (let i = code.indexOf('...'); i >= 0; i = code.indexOf('...', i + 3)) {
      if (inObject(code, i)) hits.push(`${path.relative(root, file)}:${code.slice(0, i).split('\n').length}`)
    }
  }
  assert.deepEqual(hits, [], 'object spread found — fill in the fresh object or list the fields instead')
})

test('the check finds an object spread and leaves array spread alone', () => {
  const found = (src) => { const code = codeOnly(src); const i = code.indexOf('...'); return i >= 0 && inObject(code, i) }
  assert.equal(found('const a = { ...b, c: 1 }'), true)
  assert.equal(found('f({ x, ...rest })'), true)
  assert.equal(found('const a = [...b]'), false)
  assert.equal(found('Math.max(...xs)'), false)
  assert.equal(found('function f(...args) {}'), false)
  assert.equal(found("// { ...x } in a comment\nconst s = '{ ...y }'"), false)
})
