#!/bin/bash
ADB=$(command -v adb) || { echo "adb not found (Android platform-tools)"; exit 1; }
adb() { timeout 30 "$ADB" "$@"; }  # a dropped wireless connection must not hang the script
mkdir -p /tmp/gbphone
# sendweather.sh "<location>" [lat] [lon] — broadcast generic weather to Gadgetbridge, print the watch's ACK (from logcat)
LOC="$1"; LAT="${2:-0}"; LON="${3:-0}"
adb logcat -c
adb shell "am broadcast -a nodomain.freeyourgadget.gadgetbridge.ACTION_GENERIC_WEATHER -p nodomain.freeyourgadget.gadgetbridge --es WeatherJson '{\"timestamp\":'\$(date +%s)',\"location\":\"$LOC\",\"latitude\":$LAT,\"longitude\":$LON,\"currentTemp\":287,\"todayMinTemp\":281,\"todayMaxTemp\":289,\"currentConditionCode\":800,\"currentCondition\":\"Clear\",\"forecasts\":[]}'" >/dev/null
timeout 20 bash -c 'until adb logcat -d | grep -q "ZeppOsWeatherService.*ACK"; do sleep 1; done'
adb logcat -d | grep -E 'ZeppOsWeatherService.*ACK|GenericWeatherReceiver.*(broken|Got)' | sed -E 's/.*(Weather default location ACK.*|Got generic.*|broken.*)/\1/'
