# Tests

```bash
npm test             # watchface + watch half of the parity tests (node --test tests/)
npm run test:all     # everything: the above, the phone app's unit tests and Android lint
```

| Where | What it checks |
|---|---|
| `parity/cases.json` | **The shared contract.** Each case: calendar events + settings on the phone → the exact agenda `text` → what the watch must see in it at `watchNow` |
| `parity/parity.test.mjs` | watch half: parses every `text` with `watchface/src/data/agenda.js` and compares it with `watchSees` |
| `android/app/src/test/.../agenda/AgendaParityTest.kt` | phone half: builds every case's `text` with `AgendaText.build` |
| `watch/agenda.test.mjs` | the parser's edge cases (settings incl. `rail`, overnight, year rollover), which layout is chosen when, "Free until …", wrap-up, a reminder just past kept for the buzzer only |
| `watch/buzzes.test.mjs` | when the watch buzzes: each moment at its minute, a minute late still, never twice (the stored last-buzz minute survives rebuilds), one buzz for moments in the same minute, clock set back, daily events |
| `watch/labels.test.mjs` | the label above an event ("NEXT · IN 10 MIN", "WRAP IT UP · 4 MIN LEFT", fixed times on the dim screen) and that the longest ones fit |
| `watch/rail.test.mjs` | the rail's geometry: the arc as a few joined pieces, every mark ≥ 4 px inside the rounded screen edge, halos clear of the ticks, the always-on dot on the lit one, the arc's time window, ARC/STROKE_RECT props under the assumed `DEVICE` conventions |
| `watch/refresh.test.mjs` | which widget sets an instance builds for its scene, and that a refresh with nothing new is skipped |
| `watch/testBuilds.test.mjs` | the test builds' agendas (`tools/test-builds/`): each parses and shows the intended layouts and buzzes at the intended minutes |
| `watch/clock.test.mjs` | the clock's digit boxes are wider than every glyph and centred on their slots (otherwise a digit slides sideways on the watch), and the widest time fits the screen |
| `android/app/src/test/.../agenda/AgendaTextTest.kt` | the phone's text builder: title cleaning, the 400-character cap, buzz and rail settings |

## Parity

The phone and the watch only share a string: the phone app writes the agenda text, the watchface
parses it. `cases.json` pins both halves to the same examples, so a change on one side that the other
doesn't understand fails a test. When the format changes:

1. change `android/.../agenda/AgendaText.kt` and `watchface/src/data/agenda.js` together;
2. update or add a case in `parity/cases.json` (times are local, ISO without a zone);
3. run `npm run test:all`.

Not covered by automated tests: how things look and buzz on the watch. That is checked on the device
with test builds (`tools/build.sh <test>`, README "Test builds") and screenshots (see CLAUDE.md,
"Testing on the real devices").
