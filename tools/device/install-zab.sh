#!/bin/bash
ADB=$(command -v adb) || { echo "adb not found (Android platform-tools)"; exit 1; }
adb() { timeout 30 "$ADB" "$@"; }  # a dropped wireless connection must not hang the script
mkdir -p /tmp/gbphone
# Install a .zab via Gadgetbridge: push into its files dir, open the installer, tap Install
set -e
ZAB="$1"; F=/sdcard/Android/data/nodomain.freeyourgadget.gadgetbridge/files
name=$(basename "$ZAB")
adb push "$ZAB" "$F/$name" >/dev/null
adb shell am start -a android.intent.action.VIEW -t application/octet-stream -d "file://$F/$name" \
  -n nodomain.freeyourgadget.gadgetbridge/.activities.install.FileInstallerActivity >/dev/null
for i in $(seq 1 20); do
  adb shell uiautomator dump /sdcard/gb_ui.xml >/dev/null 2>&1; adb pull /sdcard/gb_ui.xml /tmp/gbphone/ui.xml >/dev/null
  b=$(python3 -I - <<'PY'
import re
t=open("/tmp/gbphone/ui.xml",encoding="utf-8").read()
for n in re.findall(r"<node [^>]*>",t):
    txt=(re.search(r'text="([^"]*)"',n) or [0,""])[1]
    en=(re.search(r'enabled="([^"]*)"',n) or [0,""])[1]
    if txt.strip().lower()=="install" and en=="true":
        x1,y1,x2,y2=map(int,re.findall(r"\d+",re.search(r'bounds="([^"]*)"',n)[1])); print((x1+x2)//2,(y1+y2)//2); break
PY
)
  [ -n "$b" ] && break; sleep 1
done
[ -z "$b" ] && { echo "Install button not found"; grep -o 'text="[^"]*"' /tmp/gbphone/ui.xml | grep -v 'text=""' | head -20; exit 1; }
adb shell input tap $b; echo "tapped Install at $b"
