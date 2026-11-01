import { METRICS } from './metrics.js'

// Width in px of `s` set in font `font` ('medium' | 'semibold' | 'bold' | 'digits')
export function textWidth(s, font, size, letterSpacing = 0) {
  const w = METRICS[font].widths
  let em = 0
  for (const ch of s) em += w[ch] !== undefined ? w[ch] : 0.5
  return Math.round(em * size + letterSpacing * Math.max(0, s.length - 1))
}

// Cut `s` so it fits in maxW px, adding an ellipsis when it had to be cut
export function fitText(s, font, size, maxW, letterSpacing = 0) {
  if (textWidth(s, font, size, letterSpacing) <= maxW) return s
  let out = s
  while (out.length > 1 && textWidth(out + '…', font, size, letterSpacing) > maxW) out = out.slice(0, -1)
  return out.trimEnd() + '…'
}

// Split `s` into at most `maxLines` lines of maxW px, breaking at spaces; the last line gets an ellipsis if cut
export function wrapText(s, font, size, maxW, maxLines) {
  const words = s.split(' ')
  const lines = []
  let line = ''
  for (let i = 0; i < words.length; i++) {
    const candidate = line ? line + ' ' + words[i] : words[i]
    if (!line || textWidth(candidate, font, size) <= maxW) {
      line = candidate
      continue
    }
    lines.push(line)
    if (lines.length === maxLines - 1) {
      line = words.slice(i).join(' ')
      break
    }
    line = words[i]
  }
  if (line) lines.push(line)
  lines[lines.length - 1] = fitText(lines[lines.length - 1], font, size, maxW)
  return lines.map((l) => fitText(l, font, size, maxW))
}
