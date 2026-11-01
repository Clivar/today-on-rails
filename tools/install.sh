#!/bin/bash
# Install a .zab on the watch through Gadgetbridge (wireless adb) and wait until it's done
ADB=$(command -v adb) || { echo "adb not found (Android platform-tools)"; exit 1; }
adb() { timeout 30 "$ADB" "$@"; }  # a dropped wireless connection must not hang the script
mkdir -p /tmp/gbphone
set -e
adb logcat -c
"$(dirname "$0")/device/install-zab.sh" "$1"
timeout 150 bash -c 'until timeout 30 adb logcat -d | grep -q "Got current watchface"; do sleep 2; done' || echo "(no completion line seen)"
adb shell input keyevent KEYCODE_BACK
