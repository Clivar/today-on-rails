#!/bin/bash
# Build the watchface.
#   tools/build.sh [demo]   demo: a name from watchface/src/data/demos.js (clear, next, focus, always-on-…)
#                           without a demo: real data
# Prints the path of the built .zab
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
P="$ROOT/watchface"; DEMO="${1:-}"
ZEUS=${ZEUS:-$ROOT/node_modules/.bin/zeus}
[ -f "$ROOT/build/assets/images/rec.png" ] || node "$ROOT/tools/gen-assets.mjs" >/dev/null

echo "export const DEMO = $( [ -n "$DEMO" ] && echo "'$DEMO'" || echo null )" > "$P/src/data/demo-name.js"
A="$P/assets/bip6"
rm -rf "$A" && mkdir -p "$A/fonts" "$A/images"
cp "$ROOT"/fonts/*.ttf "$A/fonts/"
cp -r "$ROOT"/build/assets/images/. "$A/images/"
cd "$P" && rm -rf dist && "$ZEUS" build >/tmp/zeus-build.log 2>&1 || { cat /tmp/zeus-build.log; exit 1; }
grep -E 'rror' /tmp/zeus-build.log && exit 1
ls "$P"/dist/*.zab
