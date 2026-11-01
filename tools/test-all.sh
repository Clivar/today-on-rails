#!/usr/bin/env bash
# Every test on both sides plus Android lint — run before committing.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)

echo "== watchface + parity (node --test tests/)"
cd "$ROOT" && node --test tests/

echo "== phone app: unit tests (incl. parity) + lint"
cd "$ROOT/android" && ./gradlew -q testDebugUnitTest lintRelease

echo "all tests passed"
