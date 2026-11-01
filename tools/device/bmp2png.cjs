// Convert an uncompressed 24/32-bit BMP to PNG (no dependencies)
const fs = require('fs'), zlib = require('zlib')
const [src, dst] = process.argv.slice(2)
const b = fs.readFileSync(src)
const off = b.readUInt32LE(10), w = b.readInt32LE(18), hRaw = b.readInt32LE(22), bpp = b.readUInt16LE(28)
const comp = b.readUInt32LE(30), h = Math.abs(hRaw), bottomUp = hRaw > 0, Bpp = bpp / 8
if (![16, 24, 32].includes(bpp)) throw new Error('unsupported bpp ' + bpp + ' compression ' + comp)
const stride = Math.ceil((w * Bpp) / 4) * 4
// For 32-bit BI_BITFIELDS, read channel masks; default BGRA
let masks = null
if ((bpp === 32 || bpp === 16) && comp === 3) masks = [b.readUInt32LE(54), b.readUInt32LE(58), b.readUInt32LE(62)]
const shift = (m) => { let s = 0; while (m && !(m & 1)) { m >>>= 1; s++ } return s }
const raw = Buffer.alloc((w * 3 + 1) * h)
for (let y = 0; y < h; y++) {
  const row = off + (bottomUp ? h - 1 - y : y) * stride
  raw[y * (w * 3 + 1)] = 0
  for (let x = 0; x < w; x++) {
    const p = row + x * Bpp, o = y * (w * 3 + 1) + 1 + x * 3
    if (bpp === 16) {
      const v = b.readUInt16LE(p)
      const m = masks || [0xf800, 0x07e0, 0x001f]
      const ch = (mask) => { const sh = shift(mask); const max = mask >>> sh; return Math.round((((v & mask) >>> sh) * 255) / max) }
      raw[o] = ch(m[0]); raw[o + 1] = ch(m[1]); raw[o + 2] = ch(m[2])
    } else if (masks) {
      const v = b.readUInt32LE(p)
      raw[o] = (v & masks[0]) >>> shift(masks[0]); raw[o + 1] = (v & masks[1]) >>> shift(masks[1]); raw[o + 2] = (v & masks[2]) >>> shift(masks[2])
    } else { raw[o] = b[p + 2]; raw[o + 1] = b[p + 1]; raw[o + 2] = b[p] }
  }
}
const T = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0 }
const crc = (d) => { let c = ~0; for (const x of d) c = T[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0 }
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]) }
const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2
fs.writeFileSync(dst, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]))
console.log(`${w}x${h} ${bpp}bpp comp=${comp} -> ${dst}`)
