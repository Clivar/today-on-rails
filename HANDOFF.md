# Handoff — Today On Rails

Where things stand and how to pick it up. Read README.md (what it is, how to build) and CLAUDE.md
(device facts, testing loop, the owner's preferences) first.

## Status (2026-11-01)

**Done and verified on the real watch and phone:**

- Watchface **Today On Rails 1.0.0** (Amazfit Bip 6, Zepp OS API 4.2), installed on the owner's watch:
  - three layouts — clear (big clock + "Free until …" across days), next, Today card — chosen from the
    agenda and the phone settings; each with an always-on twin (clock in the same place and size;
    checked by overlaying both clocks for both sizes); the dim screen works while worn;
  - the rail: 12 h around the edge, concentric with the 86 px screen corners; visible time during events
    (elapsed dim / remaining lime); orange label in an event's last 5 minutes;
  - "get ready" Today card for events with a place; buzzes from the watch itself at start / 5 minutes
    left / get ready (confirmed on the wrist);
  - weather (system widget, hidden when the phone sends `no weather`), heart rate (fresh reading or
    resting HR in grey), steps, battery, Voice Memo button.
- Android app **Today On Rails 1.0.0** (`app.todayonrails`), release-signed, installed on the owner's phone:
  calendar selection, layout settings with drawings of each layout, nudges, weather (Open-Meteo, optional),
  battery-friendly sync. Three permissions, no dependencies, lint clean.
- Tests (`npm run test:all`, see tests/README.md): parity cases shared by both sides
  (`tests/parity/cases.json`, 6 cases); as of 2026-11-03 `npm test` runs 71 (watch + parity), the
  phone 9 + parity; lint clean.
- 2026-11-01: fixed minute digits sliding sideways ("0"/"4" were wider than their text boxes).

**Owner's setup:** Amazfit Bip 6, Pixel (GrapheneOS), Gadgetbridge 0.95.1 (F-Droid build). Watch display:
Always On Display "Automatic (sleep detection)", "Style follows Watchface". Gadgetbridge has no notification
access (on purpose). Breezy Weather is installed — its Gadgetbridge weather sending must stay off.

**Changes made to their Gadgetbridge during development** (check they're as wanted):
- Device settings → Developer → App logs was started (a debug log stream) — can be stopped there.
- Experimental "App management" was switched on for a while and back off.
- Their own setting: experimental "Assistant service" is on (they enabled it for the voice tests).

**Secrets:** `android/release.jks` + `android/keystore.properties` (gitignored). The owner must back them up;
every update of the app has to be signed with this key. On a new machine, copy them into `android/`.

## 2026-11-03: buzzes, rail, test builds

**Found on the watch (verified):** no buzz while always-on, and a second buzz on raising the wrist again
in the same minute. Cause: the face is rebuilt on every lit ↔ dim switch, which wiped the in-memory
"already buzzed" list. With state in storage, buzzes came from the dim instance (seen at 0:57 and 1:00).
The old buzz test had never buzzed (its agenda dropped the current minute), so the earlier "buzzes while
dimmed" note had not really been tested.

**Changed since (tests pass; device checks below):**

- **Buzzer:** every moment is an absolute minute; the watch stores one value, the minute of its last
  buzz (`lastBuzz`), and buzzes only for a due moment later than that. A moment up to a minute past
  still buzzes (the screen came on just after); a reminder just past is kept for that in
  `agenda.justPast`, which only the buzzer reads. The older `buzzed` storage key is no longer read.
- **Build per scene:** a dimmed instance builds only the always-on widgets, a lit one both
  (`data/refresh.js`); a refresh with the same inputs as the last is skipped (`refreshKey`). `pause_call`
  is gone: the face is rebuilt as it dims, so that drawing was thrown away, and it ran in the
  lit → dim switch, which lagged.
- **Rail from widgets** instead of a canvas: `STROKE_RECT` base ring, `FILL_RECT` straight runs and dots,
  `ARC` corners. Every mark keeps ≥ 4 px from the screen edge (tested). How the watch draws ARC and
  STROKE_RECT was measured on the watch (`DEVICE` in `ui/railGeometry.js`): the first try had the ARC
  stroke centred and the corners sat 4 px inside the straight runs; with `arcStroke: 'inside'` they join
  seamlessly (measured: corners and straight runs both centred 13 px in).
- **Green rail setting:** phone "Green rail" (30 min … 12 h, default 3 h) → `rail=<min>` in the cfg
  (the watch falls back to the same 180 when it's missing). The lime arc shows only when the event (its end while on) is
  that close; the phone's drawings follow the setting.
- **Wrap-up text:** in an event's last 5 minutes the label reads "WRAP IT UP · 4 MIN LEFT" in orange
  (dim screen: "WRAP IT UP · UNTIL 10:30" in a dim orange).
- **No demo code anywhere** (owner's decision): the watch's demo mode (`demos.js`, `demo-name.js`,
  `align`, `aod-check`, `buzz-test`) is gone, and so is the phone's short-lived debug "Testing" section
  and `buzz=minute`. Test data now goes in only through test builds: `tools/build.sh buzz|demo|rail|wrap-up`
  (README "Test builds"). They need no phone.
- The phone dropdowns mark their default; the Today card before an event now defaults to 30 min.

**Device checks:**

1. Done — `buzz`: the owner confirmed one buzz a minute on the wrist (2026-11-03). Still worth noticing
   over time: no second buzz on a lit/dim switch in the same minute, and quiet after 60 minutes.
2. `wrap-up`: the first-run time survives rebuilds and screen off/on — the orange label and one end
   buzz come about 3 minutes after installing (not after the last wake), then "next" for the following
   event.
3. `rail`: done for the drawing (angles, joins, smooth corners — screenshot measured). Open: on the
   wrist, no dot or cap clipped at the edge in the four corners and at 12/6 (screenshots can't show it).
4. `demo`: every layout in turn (Today card with its list, next, get ready, Free until …); the current
   temperature still shows.
5. Gadgetbridge installs a test `.zab` over the face, and reinstalling `watchface/dist/*.zab` puts the
   real face back (real name in the list); the leftover `lastBuzz` / `firstRun-*` storage does no harm
   (the next real start buzz fires).
6. A real calendar event buzzing while dimmed.
7. Phone: the release build with the "Green rail" dropdown is installed (seen 2026-11-03; it replaced the
   short-lived debug build, whose leftover settings are unused). Open: `rail=<min>` reaching the watch
   on its next weather fetch and the arc following it on the real face.

## 2026-11-04: faster build() (wrist raise ↔ always-on)

The owner reported a lag between raising the wrist and the always-on screen. Measured on the watch with
the new `perf` test build (`PERF_COUNT=0 tools/build.sh perf`):

| | start | spreads removed | now |
|---|---|---|---|
| lit build (wrist raise) | 1845 ms | 833 ms | **447 ms** |
| dim build (always-on) | 379 ms | 230 ms | **139 ms** |

- **Object spread cost ~3.9 ms per use** on the watch and the widget helpers spread every widget's
  props: all gone, guarded by `tests/watch/noSpread.test.mjs` (CLAUDE.md has the measured JS costs).
- **Only what's shown is created:** layouts and frame parts on first show (the Today card never makes
  the big clock, date, battery or complications), rail arc pieces and dots from pools, one `IMG_TIME`
  on the dim screen. Mock counts (`tests/watch/buildCost.test.mjs`): lit build 124 → 69 widgets,
  162 → 26 setProperty; dim build 19 → 10 widgets, 24 → 4.
- **Change-tracked widgets:** a minute tick writes only what changed (lit 85 → 6 calls, dim 13 → 0).
- **Dim instances** skip what they don't show (heart freshness, battery, steps) and ignore heart events.
- Fixed: a layout that failed halfway could stay visible next to the next one (`ui/screen.js` show).
- **Restructured for clarity (owner's request):** one word for lit vs. always-on, *screen* (`'lit'` /
  `'dim'`, `ui/screen.js`), passed explicitly to every component (no hidden widget level); layouts in
  `layouts/lit/` and `layouts/dim/`; `alwaysOn*` → `dim*` (files, colours `C.dim*`); the three caches in
  one place each: `ui/widgets.js` (writes), `ui/lazy.js` (creation), `data/refresh.js` (refresh).
  Same counts in the build-cost test; the dim screen seen on the watch after the change.

Open: a lit screenshot of each layout with the lazily created parts (the review of the stacking order
was done in code; the dim screen and the lit clock face were seen on the watch). Measure the lit minute
tick on the watch (the perf build shows it as `tick … ms` while lit).

## Known limitations

- New calendar data reaches the watch on its own weather fetch: up to ~30 min (occasionally longer).
  Fixing it needs a Gadgetbridge change (see "Ideas").
- Buzzes need the face to run: screen lit or always-on while worn. Fully off (always-on off, asleep,
  off-wrist) → that moment is skipped (a minute late is still caught).
- Always-on texts use fixed times instead of countdowns (simple and robust; the code does run while
  dimmed, so live countdowns would be possible).
- The agenda text is capped at 400 characters (verified 200 on the face); a busy week gets cut off at the
  later days until they come closer.
- English only; 12/24 h follows the watch setting (the owner uses 24 h; the 12 h layout is covered by
  unit tests, on the watch only by switching it to 12 h).
- Reminders = calendar events without duration (Google Tasks/Reminders aren't in the calendar provider).

## Ideas backlog (discussed, not built — ask the owner first)

1. Calendar colours on the rail (work/personal at a glance).
2. Ignore events marked "free"/tentative, or whole calendars like holidays, per calendar.
3. Quiet hours: no Today card / no buzz at night.
4. Faster updates: a small Gadgetbridge patch so a new weather location is applied (status 2 today) or the
   watch's weather refresh interval is shorter — upstreamable.
5. Done / snooze from the watch — needs a watch → phone channel (comes with the voice work).

## Next big track: the voice assistant (original goal)

The project started as a Pebble-"Index"-style wrist assistant: speak → speech-to-text → an AI decides →
note / reminder / alarm / answer, private (no vendor cloud). The watchface came first. What's known:

- Holding the Bip 6's button starts **Zepp Flow**. Gadgetbridge 0.95.1 already receives it (experimental
  "Assistant service" setting): endpoint `0x004a`, protocol v5, Opus 16 kHz decoded in
  `ZeppOsAssistantService` (`gadgetbridge/app/src/main/java/nodomain/freeyourgadget/gadgetbridge/service/devices/huami/zeppos/services/`),
  the watch detects end of speech itself. Missing: handing the audio to another app, and sending a reply
  back (reply/reminder/voice reply are TODO).
- Watch → phone messages Gadgetbridge doesn't handle yet: `0x17` (strings like `flex://app/context?...`
  with device context, `ACT`), `0x18` (Alexa-style JSON, e.g. `Device.CapabilityReport` listing
  `Calendar.AddEvents`, `Calendar.QueryEvent`, `Calendar.SummarizeEvents`, `ZeppMessenger.SendSMS`,
  `Notification.Assistant`), `0x0e` (state), `0x0c`, then `0x02` (end). Hypothesis: replies are JSON
  directives the watch executes (e.g. add a calendar event) — not verified.
- Bug found: the assistant debug buttons in Gadgetbridge always address the Alexa endpoint
  (`ZeppOsSupport.onSendConfiguration` takes the first service that accepts the key).
- Plan: patch Gadgetbridge (submodule `gadgetbridge/`) to broadcast the decoded audio and accept a text reply;
  a separate assistant app does STT + LLM (self-hostable, OpenAI-compatible) and replies; Gadgetbridge
  stays network-free → upstreamable. Testing a patched Gadgetbridge means installing a **nightly** build
  (package `.nightly`, installs next to the F-Droid one) and pairing it with the watch's auth key.
- The voice design boards are in `design/` (06 Recording … 09 Answer).
- Open: whether the Zepp Flow reply format can carry text the watch shows; whether the owner wants this
  before the ideas above.

## Resuming work on the devices

1. On the phone: Developer options → Wireless debugging → note `IP:port`; "Pair device with pairing code"
   for the code (the pairing port can be found by scanning, see CLAUDE.md). Keep the phone unlocked and
   charging with Stay awake on.
2. `adb pair <ip:pairport> <code>` then `adb connect <ip:port>`.
3. `tools/build.sh && tools/install.sh watchface/dist/*.zab`, `tools/device/watchshot.sh` to see the watch.
4. After a test build, always reinstall the real face (`tools/build.sh` without a name, then install).
5. When done, the owner turns Wireless debugging and Stay awake off.
