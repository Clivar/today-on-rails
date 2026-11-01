#!/bin/bash
ADB=$(command -v adb) || { echo "adb not found (Android platform-tools)"; exit 1; }
adb() { timeout 30 "$ADB" "$@"; }  # a dropped wireless connection must not hang the script
mkdir -p /tmp/gbphone
# Take a watch screenshot via Gadgetbridge's device card button, pull it, convert to PNG
F=/sdcard/Android/data/nodomain.freeyourgadget.gadgetbridge/files
before=$(adb shell "ls -t $F | grep '^screenshot_' | head -1")
adb shell am start --activity-clear-top -n nodomain.freeyourgadget.gadgetbridge/.activities.ControlCenterv2 >/dev/null 2>&1; sleep 1
$(dirname "$0")/tapdesc.sh "Take Screenshot" || { $(dirname "$0")/tapdesc.sh "Devices"; sleep 1; $(dirname "$0")/tapdesc.sh "Take Screenshot"; } || { echo "screenshot button not found"; exit 1; }
for i in $(seq 1 60); do
  latest=$(adb shell "ls -t $F | grep '^screenshot_' | head -1")
  [ -n "$latest" ] && [ "$latest" != "$before" ] && break
  sleep 1
done
[ "$latest" = "$before" ] && { echo "no new screenshot"; exit 1; }
sleep 1
out=/tmp/gbphone/${latest%.bmp}
adb pull "$F/$latest" "$out.bmp" >/dev/null
node $(dirname "$0")/bmp2png.cjs "$out.bmp" "$out.png"
