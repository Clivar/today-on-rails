#!/bin/bash
# Build the watchface. Prints the path of the built .zab.
#   tools/build.sh          the real face → watchface/dist/
#   tools/build.sh <test>   a test build: the face with its agenda from tools/test-builds/<test>.js
#                           (computed on the watch) instead of from the phone → build/test-<test>/dist/
# A test build is made in a copy of watchface/ with the agenda source swapped (src/data/agendaSource.js):
# no test code ever enters the source or the real build. It keeps the appId, so installing it replaces
# the face and installing the real build puts the face back.
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
TESTS="$ROOT/tools/test-builds"
TEST="${1:-}"
ZEUS=${ZEUS:-$ROOT/node_modules/.bin/zeus}
[ -f "$ROOT/build/assets/images/rec.png" ] || node "$ROOT/tools/gen-assets.mjs" >/dev/null

P="$ROOT/watchface"
if [ -n "$TEST" ]; then
  if [[ "$TEST" == */* || ! -f "$TESTS/$TEST.js" ]]; then
    echo "Unknown test build '$TEST'. Available:"
    for f in "$TESTS"/*.js; do echo "  $(head -1 "$f" | sed 's|^// ||')"; done
    exit 1
  fi
  P="$ROOT/build/test-$TEST"
  rm -rf "$P" && mkdir -p "$P"
  cp -r "$ROOT/watchface/." "$P/" && rm -rf "$P/dist"
  mkdir -p "$P/src/testBuild/shared"
  cp "$TESTS/$TEST.js" "$P/src/testBuild/"
  cp "$TESTS/shared/agendaText.js" "$P/src/testBuild/shared/"
  cp "$TESTS/shared/agendaSource.js" "$P/src/data/agendaSource.js"
  # The test and an id for this build (its first run is stored under it)
  printf "export { agendaText } from './%s.js'\nexport const BUILD = '%s'\n" "$TEST" "$TEST-$(date +%s)" \
    > "$P/src/testBuild/build.js"
  # Its own name in the watchface list (no brackets: the file name goes through adb shell in tools/install.sh)
  node -e '
    const fs = require("fs"), file = process.argv[1], name = `Today On Rails test ${process.argv[2]}`
    const app = JSON.parse(fs.readFileSync(file, "utf8"))
    app.app.appName = name
    app.i18n["en-US"].name = name
    fs.writeFileSync(file, JSON.stringify(app, null, 2) + "\n")' "$P/app.json" "$TEST"
fi

A="$P/assets/bip6"
rm -rf "$A" && mkdir -p "$A/fonts" "$A/images"
cp "$ROOT"/fonts/*.ttf "$A/fonts/"
cp -r "$ROOT"/build/assets/images/. "$A/images/"
LOG=/tmp/zeus-build${TEST:+-$TEST}.log
cd "$P" && rm -rf dist && "$ZEUS" build >"$LOG" 2>&1 || { cat "$LOG"; exit 1; }
grep -E 'rror' "$LOG" && exit 1
ls "$P"/dist/*.zab
