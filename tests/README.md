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
| `watch/agenda.test.mjs` | the parser's edge cases, which layout is chosen when, "Free until …", buzz timing |
| `watch/clock.test.mjs` | the clock's digit boxes are wider than every glyph and centred on their slots (otherwise a digit slides sideways on the watch), and the widest time fits the screen |
| `android/app/src/test/.../agenda/AgendaTextTest.kt` | the phone's text builder: title cleaning, the 400-character cap, buzz settings |

## Parity

The phone and the watch only share a string: the phone app writes the agenda text, the watchface
parses it. `cases.json` pins both halves to the same examples, so a change on one side that the other
doesn't understand fails a test. When the format changes:

1. change `android/.../agenda/AgendaText.kt` and `watchface/src/data/agenda.js` together;
2. update or add a case in `parity/cases.json` (times are local, ISO without a zone);
3. run `npm run test:all`.

Not covered by automated tests: how things look and buzz on the watch. That is checked on the device
with demo builds and screenshots (see CLAUDE.md, "Testing on the real devices").
