#!/bin/bash
ADB=$(command -v adb) || { echo "adb not found (Android platform-tools)"; exit 1; }
adb() { timeout 30 "$ADB" "$@"; }  # a dropped wireless connection must not hang the script
mkdir -p /tmp/gbphone
# Tap the first UI element whose content-desc or text equals $1; exit 1 if not found
adb shell uiautomator dump /sdcard/gb_ui.xml >/dev/null 2>&1; adb pull /sdcard/gb_ui.xml /tmp/gbphone/ui.xml >/dev/null
xy=$(python3 -I - "$1" <<'PY'
import re,sys
want=sys.argv[1]
t=open("/tmp/gbphone/ui.xml",encoding="utf-8").read()
for n in re.findall(r"<node [^>]*>",t):
    g=lambda k:(re.search(k+r'="([^"]*)"',n) or [None,""])[1]
    if want in (g("content-desc"), g("text")):
        x1,y1,x2,y2=map(int,re.findall(r"\d+",g("bounds"))); print((x1+x2)//2,(y1+y2)//2); break
PY
)
[ -z "$xy" ] && exit 1
adb shell input tap $xy
