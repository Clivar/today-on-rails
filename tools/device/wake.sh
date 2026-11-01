#!/bin/bash
ADB=$(command -v adb) || { echo "adb not found (Android platform-tools)"; exit 1; }
adb() { timeout 30 "$ADB" "$@"; }  # a dropped wireless connection must not hang the script
mkdir -p /tmp/gbphone
# Wake the watch and return it to the watchface: Find lost device -> OK -> dismiss ("You found it")
T=$(dirname "$0")/tapdesc.sh
adb shell am start --activity-clear-top -n nodomain.freeyourgadget.gadgetbridge/.activities.ControlCenterv2 >/dev/null 2>&1; sleep 1
$T "Find lost device" || { $T "Devices"; sleep 1; $T "Find lost device"; }
sleep 1; $T "OK"; sleep 3
# Stop searching: tap the snackbar action if visible, otherwise restarting the activity dismisses it
adb shell uiautomator dump /sdcard/gb_ui.xml >/dev/null 2>&1; adb pull /sdcard/gb_ui.xml /tmp/gbphone/ui.xml >/dev/null
act=$(grep -oE 'text="[^"]*found it[^"]*"' -i /tmp/gbphone/ui.xml | head -1 | sed -E 's/text="(.*)"/\1/')
if [ -n "$act" ]; then $T "$act"; else adb shell am start --activity-clear-top -n nodomain.freeyourgadget.gadgetbridge/.activities.ControlCenterv2 >/dev/null 2>&1; fi
sleep 3
