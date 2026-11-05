# CLAUDE.md — Today On Rails

Working notes for Claude Code. Product overview and build steps: README.md. Current state and what's
next: HANDOFF.md. Everything below was learned the hard way on the real devices — trust it over the
Zepp OS typings and docs where they disagree.

## The owner and how to work with them

- Wants **production quality**: tests on both sides, lint clean, verified on the real watch/phone.
- Code structure they asked for: **every screen in its own file** (`watchface/src/layouts/`), behaviour
  grouped in **components** (`watchface/src/components/`, `android/.../ui/*Section.kt`), easy to read.
  Remove what's unused.
- **Battery first** on the watch: no extra timers, no continuous sensors; reuse the minute tick.
- **Privacy:** no internet unless needed (the app's only network use is weather, and it's optional),
  **no phone notifications** (rejected explicitly — the watch buzzes by itself), Gadgetbridge has no
  notification access on their phone and that's on purpose. GrapheneOS phone.
- A watchface only — **no Zepp OS app** (one was built and removed).
- **No demo or test code in the watchface or the phone app.** Test data goes in only through test
  builds made by the build script (`tools/build.sh <test>`, data in `tools/test-builds/`). The phone
  app is one production build, with no debug-only features. (Testing through the phone was rejected:
  new data only reaches the watch on its own weather fetch, ~30 min.)
- Keep personal data out of the repo: calendar titles, account names/e-mails, device MAC addresses.
- The signing key (`android/release.jks` + `keystore.properties`) must never be committed.
- Ask before outward-facing or irreversible actions; change phone/watch settings only when needed and
  restore them (say so).

## Commands

```bash
tools/setup.sh                   # once: chromium, JDK 21, adb, Android SDK 37, npm install (zeus)
npm test                         # watch + parity: node --test tests/ (tests/README.md)
npm run test:all                 # everything: npm test + gradle unit tests + lintRelease
tools/build.sh [test]            # watch: → watchface/dist/*.zab; a test build → build/test-<test>/dist/*.zab
tools/install.sh <zab>           # install on the watch through Gadgetbridge (needs the phone over adb)
cd android && ./gradlew testDebugUnitTest lintRelease assembleRelease   # phone app
```

Always run `npm run test:all` after changes. The agenda text format is shared: change
`android/.../agenda/AgendaText.kt` and `watchface/src/data/agenda.js` together and add/update a case in
`tests/parity/cases.json` — both sides run every case (`AgendaParityTest.kt`, `parity.test.mjs`).
`package.json` is `"type": "module"`: Node scripts that use `require` must be `.cjs`.

## Architecture in one paragraph

The Android app reads the calendar, builds an **agenda text**
(`Brussels · 31/10 · cfg next=360 focus=0 during=1 ready=60 rail=180 buzz=start+end · C09:00-10:30 Team call · R18:00 Water the plants · 1/11 · C@14:00-15:00 Dentist`,
format in README) and sends it to Gadgetbridge as the `location` of a generic weather broadcast
(`ACTION_GENERIC_WEATHER`, `WeatherGz`). The watch fetches weather from Gadgetbridge over its own HTTP
emulation and gets the text back as the city name; the watchface reads `new Weather().getForecast().cityName`
(only in `data/agendaSource.js`, the one module a test build swaps), parses it, picks a layout
(`chooseLayout`) and buzzes at chosen moments (`dueBuzz`).

## Zepp OS / Amazfit Bip 6 facts (verified on the device)

- Bip 6: 390×450, **screen corner radius 86 px** (Zepp device spec `rAngle`); deviceSources 9765120,
  9765121, 10158337 (the `.zab` must list them or Gadgetbridge won't install it). API level 4.2.
- `px` is **not global** at API ≥ 3: import it from `@zos/utils`.
- Weather: the method is **`getForecast()`**; `getForecastWeather()` from the typings doesn't exist.
  The forecast has only `high`/`low`/`index`; the current temperature needs the system data widget
  `TEXT_IMG` with `ui.data_type.WEATHER_CURRENT`.
- Zepp OS API objects are proxies: touching prototypes (`Weather.prototype`) throws "proxy: inconsistent get".
- Text layout: TEXT widgets place the baseline at `y + size` (Barlow ascent 1.0, descent 0.2, box 1.2em).
  Custom fonts work via `font: 'fonts/X.ttf'` (TTF in `assets/<target>/fonts/`).
- Canvas: `drawLine` ignores its own `color`/`line_width` — call `setPaint` first. Thick lines need round
  joints (draw circles at the points) or corners look jagged.
- `CIRCLE` widgets can't be moved after creation (`MORE` with `center_x` is ignored); use a `FILL_RECT`
  with `radius`. `VISIBLE` works on all widgets used here.
- Watchfaces pause when the screen is off. `WIDGET_DELEGATE` `resume_call` catches up on wake. The face
  has no `pause_call`: the watch rebuilds the face as it dims, so drawing on pause was thrown away, and
  it ran right in the lit → dim switch, which lagged.
- **Always-on (AOD):** while dimmed only widgets with `show_level: ONAL_AOD` show. The face is **rebuilt on
  every switch** between lit and dim (`getScene()`: 1 lit, 3 dim) and after the screen was off, so
  in-memory state is lost: keep what must survive in `localStorage` (`data/saved.js`, needs the
  `device:os.local_storage` permission). In the code the two are **screens**, `'lit'` and `'dim'`
  (`ui/screen.js`); a dimmed instance builds only the dim screen, a lit one both
  (`data/refresh.js` `screensToBuild`).
  **Flag every lit widget `ONLY_NORMAL`** (unflagged ones show on both and broke AOD): every widget is
  made by its screen (`screen.widget()` / `screen.text()`, the screen passed explicitly to every
  component), which sets `show_level`. A **CANVAS flagged ONAL_AOD has no drawing methods** ("not a function").
  AOD only happens **while worn**; then the face's code does run (minute ticks continue). Off the wrist
  the screen just turns off and nothing runs — don't test AOD with the watch on a table.
- `IMG_TIME` gives every digit a **fixed-width slot** (width of the digit images; `hour_space` between).
  The normal clock therefore also uses fixed slots (`ui/clockSlots.js`) so both line up exactly; AM/PM
  are `am_x/am_y` images at a fixed spot (`ui/clockSizes.js`).
- A TEXT box **narrower than its glyph** is not centred: the watch shifts the text, so "0"/"4" (a bit
  wider than a digit slot) slid sideways. Digit boxes are the slot plus padding on both sides
  (`glyphBox`), tested in `tests/watch/clock.test.mjs`; the always-on digit images are flex-centred.
- The screen edge **clips marks** near it: with the rail's outer ring 10 px in, its 16 px dot was
  visibly cut. The ring now sits 13 px in, and every dot, cap and arc keeps ≥ 4 px from the rounded edge
  (`tests/watch/rail.test.mjs`).
- **JS is slow on the watch** (measured 2026-11-04 with `tools/build.sh perf`, 200 × each): object spread
  `{ ...a }` **≈ 3.9 ms per use** (the build tool turns it into a slow helper) → never in `watchface/`,
  guarded by `tests/watch/noSpread.test.mjs`; `Object.assign` ≈ 0.5 ms; array spread, destructuring,
  `for…of`, `forEach`, a function call ≈ 0.1–0.2 ms; `Date.now()` 0.15 ms (1 ms resolution); proxy
  lookups like `ui.prop.MORE` ≈ 0.02 ms; `createWidget` ≈ 4 ms. Build times: lit 1845 ms → 833 ms
  (spreads removed) → 447 ms (create only what's shown, change-tracked writes); dim 379 → 230 → 139 ms.
  Node with mocks is ~100× faster than the watch: measure on the device, not in Node.
- `WatchFace({...})` must be **called in the entry file** (`watchface/index.js`) itself: calling it from
  another module left the face blank.
- **Three caches, one place each** (components contain none):
  drawing — every widget is a `Widget` (`ui/widgets.js`) that skips writes that change nothing;
  creating — layouts, frame parts and pools are made when first shown (`ui/lazy.js` `lazy`, `pool`);
  refreshing — a refresh with the same inputs as the last is skipped (`data/refresh.js` `refreshKey`,
  `createRedrawCheck`). Storage (`data/saved.js`) is for what must outlive an instance.
- **Stacking:** widgets stack in creation order, so whatever is made later lies on top.
  `layouts/lit/frame.js` fixes the order (background, rail, the first layout's frame parts and
  widgets, record button); the rail's pools re-create the layers above one that grows (`components/rail.js`).
- The watch **vibrates from a watchface**: `new Vibrator().start({ mode: VIBRATOR_SCENE_NOTIFICATION })`
  (`@zos/sensor`), no permission. Works while lit and from the dim (AOD) instance (verified 2026-11-03).
- `launchApp` from a watchface works (`SYSTEM_APP_VOICE_MEMO`, `native: true`); `launchApp` takes no params.
- Heart rate: `getLast()` + `onLastChange` (no extra sensor use), `getToday()` per-minute array (find the
  age of the last reading), `getResting()`. `onCurrentChange` = continuous measurement = battery drain.
- `zeus` 1.9.3 on Node 26 fails to load `zeppos-app-utils`: `npm install` symlinks it (package.json postinstall).
  `zeus build` needs no Zepp account. Its "intermediate products" notice is about Zepp's store; ignore.

**ARC and STROKE_RECT** (measured 2026-11-03 on a screenshot of `tools/build.sh rail`): `ARC` angles are
degrees, **0° = 3 o'clock, clockwise**; its stroke lies **inside** the x/y/w/h box (outer edge on the box —
with the box on the stroke's centre line the corners sat 4 px inside the straight runs). `STROKE_RECT`
also strokes inside its box. Both draw smooth (anti-aliased) edges. These are the `DEVICE` values in
`ui/railGeometry.js`; the lit rail is `FILL_RECT` straight runs and dots, `ARC` corners, a `STROKE_RECT`
base ring. Measure such things on the raw BMP (`/tmp/gbphone/*.bmp`), not by eye.

## Gadgetbridge facts (0.95.1, the version on the phone; submodule is master `86703c8006`)

- Weather path: generic weather broadcast → `ZeppOsWeatherService.onSendWeather` sets the watch's default
  location (`locationKey` = `lat,lon,xiaomi_accu:<timestamp>`, name = `location`). After the first one the
  watch answers **status 2 and doesn't apply it**; the city name only changes on the watch's own HTTP fetch
  (`ZeppOsHttpService`, `weather/v5/...datasets=place,...` → `place.affiliation`). That fetch runs on the
  watch's schedule: about every 30 min (`HttpAppsSettingsHandler`: hourly cooldown 30 min, interval 120).
  So agenda changes reach the watch with up to ~30 min (sometimes longer) delay.
- Weather broadcast message size: 850 characters ACKed, 1000 not; 200 verified shown on the face. The app
  keeps it under 400.
- Only one app should send weather; the last one wins (WeatherSpec isn't merged).
- File installs: `.zab` via the exported `FileInstallerActivity` (`file://` URI in Gadgetbridge's files dir).
  Installing a watchface makes it the active one.
- App Manager (experimental "App management" setting): **don't use "Start" on Zepp OS apps** — it returned
  status 3 and opened the watch's Workout app.
- `ZeppOsAssistantService` (Alexa 0x0011 and **Zepp Flow 0x004a**): decodes the Opus voice stream (16 kHz,
  Flow protocol version 5); replies, reminders and voice replies are TODO. Bug: its debug buttons (simple/
  complex reply, trigger) always go to the Alexa endpoint (first matching service in `mServiceMap`). Zepp
  Flow also sends unhandled JSON messages: `0x17` (`flex://app/context?...`, `ACT`), `0x18` (Alexa-style
  `Device.CapabilityReport` incl. `Calendar.AddEvents`, `Calendar.QueryEvent`, `ZeppMessenger.SendSMS`),
  `0x0e` (state), `0x0c`. Details for the voice track: HANDOFF.md.
- Voice memos download over BLE too (`ZeppOsVoiceMemosService`), saved under the export dir `voicememo/`.
- Receiving files from the watch on file-transfer v3 is implemented.
- Watch app-log streaming (`logsType=jsapp`) does not forward watchface `console.log`/logger output.
- Gadgetbridge logs to logcat (tag = class name) at DEBUG; the file log flushes late.

## Testing on the real devices

The phone is reached over **wireless adb** from the dev container (host network). The phone may be on
another VLAN: mDNS discovery won't work, the user gives `IP:port` + pairing code. If only the code is
given, find the pairing port with a port scan of 30000–50000 (`adb pair ip:port code`, then
`adb connect ip:<port on the main Wireless debugging screen>`).

- The phone must stay **unlocked** (Developer options → Stay awake works only while charging). If
  `isKeyguardShowing=true`, ask the user.
- Wrap adb calls in `timeout`: a stale wireless connection lists the device but hangs every shell
  command → `adb disconnect` + `adb connect`.
- `tools/device/`: `install-zab.sh` (push + open in Gadgetbridge + tap Install), `watchshot.sh`
  (Gadgetbridge's "Take Screenshot" → BMP → PNG in `/tmp/gbphone`), `wake.sh` (Find lost device → stop;
  this vibrates the watch), `tapdesc.sh "<text>"` (tap by text/content-desc), `sendweather.sh "<text>"`.
- Screenshot quirks: BMPs are 400×450 (10 px padding right), top-down, 24-bit — sometimes 16-bit RGB565
  frames caught mid-redraw (retake); filenames use a 12-hour clock (sort by mtime). A screenshot taken
  while the worn watch is dimmed shows the always-on widgets (not the dim brightness).
  A screenshot of a paused face shows its last frame (check the clock).
- **Test builds** (`tools/build.sh <test>`; unknown name → lists them): the script copies `watchface/` to
  `build/test-<test>/` (gitignored) and swaps `src/data/agendaSource.js` for
  `tools/test-builds/shared/agendaSource.js`, which computes the agenda text on the watch from its own
  clock (`tools/test-builds/<test>.js`). No phone or weather fetch needed. Times are laid out from the
  first run, stored as `firstRun-<build id>` so it survives rebuilds; each new build starts afresh. The
  face is renamed "Today On Rails test <test>" with the same appId, so installing it replaces the face.
  - `buzz`: a start buzz every minute for an hour after installing, then quiet (wear it to test dimmed).
  - `demo`: a sample day for screenshots, through every layout in about 5 hours (no buzzes).
  - `rail`: long arcs through the corners and a dot on every hour, whatever the time: screen-edge
    clipping and the `DEVICE` conventions of `ui/railGeometry.js`.
  - `wrap-up`: "WRAP IT UP" and the end buzz 3 minutes after installing, then the next event.
  - `perf`: times `build()` and every refresh on the watch and shows it on screen (a busy Today card),
    for the lit and the dim instance (each keeps the other's last numbers in storage). Lines: build ms
    and first refresh; widgets and setProperty calls; the last refresh; where the first refresh's time
    went (`mkN`/`mkA` building the lit/dim screen, `in` inputs, `st` readState, `hr` heart, `show`
    drawing, `tw` text measuring); two `x200 ms` calibration lines. `PERF_COUNT=0 tools/build.sh perf`
    for clean times (per-call counting adds two `Date.now()` per widget call). The rewrites live in
    `tools/test-builds/perf/instrument.mjs` and stop the build if `index.js` no longer matches.

  **Put the real face back afterwards:** `tools/build.sh && tools/install.sh watchface/dist/*.zab`.
  `tests/watch/testBuilds.test.mjs` checks each test agenda. 12-hour layouts: switch the watch to 12 h.
- `tools/compare.sh` puts a design board next to a screenshot; `tools/sheet.sh` makes contact sheets.
- Taps in the phone app: wait for scrolling to stop and keep targets away from the status bar, or taps
  are swallowed.
- Watch layout calibration came from the design boards: `design/spec/*.html` (cleaned DOM with exact
  positions, sizes and colors) and `design/*.png` (renders).

## Android app notes

- Package `app.todayonrails`, minSdk 31, target 35, compileSdk 37, AGP 9.4.1 / Gradle 9.8.2 (same as
  Gadgetbridge), Kotlin built into AGP, **no dependencies** (JUnit for tests only).
- Permissions: READ_CALENDAR, INTERNET (weather only), RECEIVE_BOOT_COMPLETED (persisted hourly job).
- Sync triggers (battery): calendar content-trigger job (no network; reuses cached weather), hourly
  periodic job (weather ≤ every 55 min + 7-day look-ahead), clock/time-zone change, "Send now", first run.
  Identical data isn't resent (hash) for 6 h.
- One release app: no debug-only sources or build-type features (owner's decision; see above).
- "Green rail" setting (`rail_minutes`, choices 30/60/180/360/720 min, default 180) → `rail=` in the
  agenda; the watch draws the lime arc only when the event (its end while on) is that close. With no
  `rail=` in the text the watch uses the same 180 (its fallbacks in `agenda.js` `DEFAULT_SETTINGS` match the app's defaults).
- Our `Settings` class clashes with `android.provider.Settings` — alias one of them when both are needed.
- Lint must stay clean (`abortOnError`).
