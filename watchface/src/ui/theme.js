// "Ink & Lime" for the Bip 6 (390 x 450 AMOLED). Values come from the design boards.
export const W = 390
export const H = 450

export const C = {
  bg: 0x000000,
  text: 0xf3f5ef,
  muted: 0x9ea39a,
  numeral: 0x8a8f86,
  line: 0x2b2e2a,
  tick: 0x3a3e38,
  lime: 0xb6f35a,
  alert: 0xffb15c,
  // Always-on
  aodLime: 0x7fa83f,
  aodArc: 0x56722a,
  aodNow: 0x8c918a,
  aodText: 0x8c918a,
  aodMuted: 0x767a73,
  aodAlert: 0xb37c40, // alert dimmed like aodLime is to lime (about 0.7)
  aodNumeral: 0x5a5e57,
}

// Font files live in assets/bip6/fonts/
export const F = {
  medium: 'fonts/Barlow-Medium.ttf',
  semibold: 'fonts/Barlow-SemiBold.ttf',
  bold: 'fonts/Barlow-Bold.ttf',
  digits: 'fonts/BarlowCondensed-SemiBold.ttf',
}
