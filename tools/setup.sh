#!/bin/bash
# One-time setup of the build tools (Debian/Ubuntu; run in the dev container or on a similar machine).
#   Watchface:  Node (zeus build tool via npm), Chromium (renders the image assets)
#   Phone app:  JDK 21, Android SDK (platform 37), adb
# Idempotent: skips what's already there.
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
SDK=${ANDROID_HOME:-$HOME/android-sdk}

need() { ! command -v "$1" >/dev/null 2>&1; }
if need chromium || need java || need adb || need unzip; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq chromium openjdk-21-jdk-headless adb unzip >/dev/null
fi

# zeus (Zepp OS build tool); postinstall fixes its module path for Node 26
(cd "$ROOT" && npm install --no-audit --no-fund --silent)

# Android SDK command-line tools, platform and build tools
if [ ! -d "$SDK/platforms/android-37.0" ]; then
  mkdir -p "$SDK/cmdline-tools"
  tmp=$(mktemp -d)
  curl -sSfL -o "$tmp/tools.zip" https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip
  unzip -q "$tmp/tools.zip" -d "$tmp" && rm -rf "$SDK/cmdline-tools/latest" && mv "$tmp/cmdline-tools" "$SDK/cmdline-tools/latest"
  rm -rf "$tmp"
  yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" --licenses >/dev/null
  "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" "platform-tools" "platforms;android-37.0" "build-tools;36.0.0" >/dev/null
fi
echo "sdk.dir=$SDK" > "$ROOT/android/local.properties"

echo "Ready. Watchface: npm test && tools/build.sh — phone app: cd android && ./gradlew assembleRelease"
