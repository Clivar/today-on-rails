#!/usr/bin/env bash
# Downloads the Whisper model that the voice app bundles (android/voice/src/main/assets/models/,
# not in version control) and checks its SHA-256. Once per machine; the app itself never downloads.
#   tools/voice-model.sh              # small-q5_1 (190 MB), the default
#   tools/voice-model.sh base-q5_1    # then build with: ./gradlew :voice:assembleRelease -PvoiceModel=base-q5_1
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
MODEL=${1:-small-q5_1}

# Multilingual whisper.cpp models (huggingface.co/ggerganov/whisper.cpp) and their SHA-256
case "$MODEL" in
  base-q5_1)           SHA=422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898 ;; #  60 MB
  base-q8_0)           SHA=c577b9a86e7e048a0b7eada054f4dd79a56bbfa911fbdacf900ac5b567cbb7d9 ;; #  82 MB
  small-q5_1)          SHA=ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb ;; # 190 MB
  small-q8_0)          SHA=49c8fb02b65e6049d5fa6c04f81f53b867b5ec9540406812c643f177317f779f ;; # 264 MB
  large-v3-turbo-q5_0) SHA=394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2 ;; # 574 MB
  *) echo "Unknown model '$MODEL': base-q5_1 base-q8_0 small-q5_1 small-q8_0 large-v3-turbo-q5_0" >&2; exit 1 ;;
esac

DIR="$ROOT/android/voice/src/main/assets/models"
FILE="$DIR/ggml-$MODEL.bin"
mkdir -p "$DIR"
if [ -f "$FILE" ] && echo "$SHA  $FILE" | sha256sum -c --quiet 2>/dev/null; then
  echo "Already there: $FILE"
  exit 0
fi

curl -fL --progress-bar -o "$FILE.part" "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-$MODEL.bin"
if ! echo "$SHA  $FILE.part" | sha256sum -c --quiet; then
  rm -f "$FILE.part"
  echo "Checksum mismatch: download discarded" >&2
  exit 1
fi
mv "$FILE.part" "$FILE"
# Only one model in the APK
find "$DIR" -name 'ggml-*.bin' ! -name "ggml-$MODEL.bin" -delete
echo "Saved $FILE"
