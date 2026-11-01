#!/bin/bash
# sheet.sh out.png img1.png img2.png … — screenshots side by side with their file names
O=$(realpath -m "$1"); shift; T=$(mktemp --suffix=.html); n=$#
{ echo '<html><body style="margin:0;background:#222;display:flex;gap:10px;padding:10px;font:14px sans-serif;color:#ccc">'
  for f in "$@"; do echo "<div><div style=\"width:400px;height:450px;background:url('file://$(realpath "$f")')\"></div>$(basename "$f" .png)</div>"; done
  echo '</body></html>'; } > "$T"
chromium --headless=new --no-sandbox --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=$((n * 410 + 10)),490 --virtual-time-budget=1000 --screenshot="$O" "file://$T" >/dev/null 2>&1
rm -f "$T"; echo "$O"
