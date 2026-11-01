#!/bin/bash
# compare.sh <design-board.png> <watch-screenshot.png> <out.png>
# Left: the 390x450 screen area of a design board. Right: the watch screenshot (390 wide).
D=$(realpath "$1"); S=$(realpath "$2"); O=$(realpath -m "$3")
T=$(mktemp --suffix=.html)
cat > "$T" <<HTML
<html><body style="margin:0;background:#222;display:flex;gap:10px;padding:10px">
<div style="width:390px;height:450px;background:url('file://$D') -78px -75px"></div>
<div style="width:390px;height:450px;background:url('file://$S') 0 0"></div>
</body></html>
HTML
chromium --headless=new --no-sandbox --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=810,470 --virtual-time-budget=1000 --screenshot="$O" "file://$T" >/dev/null 2>&1
rm -f "$T"; echo "$O"
