# Handoff — Today On Rails

Where things stand and how to pick it up. Read README.md (what it is, how to build) and CLAUDE.md
(device facts, testing loop, the owner's preferences) first.

## Status (2026-10-31)

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
- Tests: `npm test` (17, watch side), `./gradlew testDebugUnitTest` (8, phone side).

**Owner's setup:** Amazfit Bip 6, Pixel (GrapheneOS), Gadgetbridge 0.95.1 (F-Droid build). Watch display:
Always On Display "Automatic (sleep detection)", "Style follows Watchface". Gadgetbridge has no notification
access (on purpose). Breezy Weather is installed — its Gadgetbridge weather sending must stay off.

**Changes made to their Gadgetbridge during development** (check they're as wanted):
- Device settings → Developer → App logs was started (a debug log stream) — can be stopped there.
- Experimental "App management" was switched on for a while and back off.
- Their own setting: experimental "Assistant service" is on (they enabled it for the voice tests).

**Secrets:** `android/release.jks` + `android/keystore.properties` (gitignored). The owner must back them up;
every update of the app has to be signed with this key. On a new machine, copy them into `android/`.

## Known limitations

- New calendar data reaches the watch on its own weather fetch: up to ~30 min (occasionally longer).
  Fixing it needs a Gadgetbridge change (see "Ideas").
- Buzzes need the face to run: screen lit or always-on while worn. Fully off (always-on off, asleep,
  off-wrist) → that moment is skipped (a minute late is still caught).
- Always-on texts use fixed times instead of countdowns (simple and robust; the code does run while
  dimmed, so live countdowns would be possible).
- The agenda text is capped at 400 characters (verified 200 on the face); a busy week gets cut off at the
  later days until they come closer.
- English only; 12/24 h follows the watch setting (the owner uses 24 h; 12 h layout is tested in demos).
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
4. After demo/test builds, always reinstall the real face (`tools/build.sh` without a demo).
5. When done, the owner turns Wireless debugging and Stay awake off.
