#!/usr/bin/env bash
# Runs only in the isolated CI diagnostic checkout.
# Usage: bash run-unlock-probe.sh CHECKOUT APK OUTPUT LABEL [BUILD_PROVENANCE]
set -euo pipefail

probe_checkout="$(cd "$1" && pwd)"
probe_apk="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
mkdir -p "$3"
probe_output="$(cd "$3" && pwd)"
probe_label="$4"
probe_provenance="${5:-}"
probe_package="$(cd "$(dirname "$0")" && pwd)"
probe_serial="${STARTUP_DIAG_SERIAL:-emulator-5554}"

if [[ "$(uname -m)" != "x86_64" ]]; then
  echo 'CI APK requires a Linux x86_64 Android runner.' >&2
  exit 2
fi
if [[ "$probe_checkout" == *metamask-mobile-lighter-final-integration-11 || "$probe_checkout" == *metamask-mobile-lighter-main-sync-12 ]]; then
  echo 'Use a disposable exact-head checkout; retain the frozen product checkouts.' >&2
  exit 2
fi
python3 "$probe_package/record-provenance.py" "$probe_checkout" "$probe_output/runtime-input.json" "$probe_label"
python3 - "$probe_package/pins.json" "$probe_apk" "$probe_label" "$probe_provenance" "$probe_output" <<'VERIFY'
from pathlib import Path
import hashlib
import json
import sys
pins, apk, label, build_file, output = sys.argv[1:]
pin = json.loads(Path(pins).read_text())['heads'][label]
actual = hashlib.sha256(Path(apk).read_bytes()).hexdigest()
if label == 'mobile11-reference':
    expected = pin['apkSha256']
else:
    if not build_file:
        raise SystemExit('Fresh build requires matching build-provenance.json')
    build = json.loads(Path(build_file).read_text())
    if build['checkoutSha'] != pin['sha'] or build['checkoutTree'] != pin['tree']:
        raise SystemExit('Build provenance does not match pinned product input')
    if build['buildMode'] != 'fresh-native-and-js-no-donor-no-repack':
        raise SystemExit('Matched comparison requires fresh native and JS builds')
    runtime = json.loads(Path(output, 'runtime-input.json').read_text())
    if build['installedPerpsFileSha256'] != runtime['installedPerpsFileSha256']:
        raise SystemExit('Build/runtime installed Perps package hashes do not match')
    expected = build['apkSha256']
if actual != expected:
    raise SystemExit('APK SHA256 does not match input provenance')
Path(output, 'apk-input.json').write_text(json.dumps({
    'inputLabel': label, 'headSha': pin['sha'], 'headTree': pin['tree'],
    'apkSha256': actual,
}, indent=2) + '\n')
VERIFY
python3 "$probe_package/prepare-unlock-probe.py" "$probe_checkout" "$probe_output" "$probe_label"
python3 "$probe_package/capture-logcat.py" "$probe_serial" "$probe_output/logcat.filtered.log" &
probe_log_pid=$!
trap 'kill "$probe_log_pid" 2>/dev/null || true; wait "$probe_log_pid" 2>/dev/null || true' EXIT

cd "$probe_checkout"
export ANDROID_APK_PATH="$probe_apk"
export ANDROID_DEVICE_UDID="$probe_serial"
export ANDROID_AVD_NAME=appium_smoke_avd
export ANDROID_DEVICE_POOL_SIZE=1
export E2E_WORKERS=1
export ANDROID_APPIUM_USE_PACKAGE_ONLY=true
export ANDROID_EMULATOR_BOOT_MODE=cold
export ANDROID_BOOT_TIMEOUT_MS=300000
export ANDROID_EMULATOR_POST_BOOT_SETTLE_MS=30000
export ANDROID_EMULATOR_NETWORK_READY_TIMEOUT_MS=90000
export ANDROID_EMULATOR_NETWORK_READY_CONSECUTIVE_PINGS=3
export CI=true
export APPIUM_RETRIES_OVERRIDE=0
export APPIUM_RECORD_VIDEO_ON_FAILURE=false
export APPIUM_RECORD_VIDEO_ALWAYS=false
export APPIUM_SMOKE_SUITE_NAME=startup-diagnostic
set +e
yarn playwright test --config "$probe_output/playwright.config.ts" --project android-smoke --workers=1 --retries=0 \
  2>&1 | python3 "$probe_package/filter-diagnostic-log.py" > "$probe_output/appium.filtered.log"
probe_pipe_status=("${PIPESTATUS[@]}")
probe_playwright_exit=${probe_pipe_status[0]}
probe_exit=$probe_playwright_exit
probe_filter_exit=${probe_pipe_status[1]}
if [[ "$probe_filter_exit" != 0 ]]; then probe_exit=2; fi
set -e
kill "$probe_log_pid" 2>/dev/null || true
wait "$probe_log_pid" 2>/dev/null || true
trap - EXIT
set +e
python3 - "$probe_output" "$probe_exit" "$probe_filter_exit" "$probe_playwright_exit" <<'RESULT'
from pathlib import Path
import json
import sys
out = Path(sys.argv[1])
inputs = json.loads((out / 'apk-input.json').read_text())
capture_file = out / 'logcat-capture.json'
capture = json.loads(capture_file.read_text()) if capture_file.exists() else {}
capture_valid = capture.get('captureStatus') == 'stopped-after-capture' and capture.get('inputLines', 0) > 0
diagnostic_exit = int(sys.argv[2]) or (0 if capture_valid else 2)
(out / 'run-result.json').write_text(json.dumps({
    **inputs,
    'diagnosticExitCode': diagnostic_exit,
    'playwrightExitCode': int(sys.argv[4]),
    'logFilterExitCode': int(sys.argv[3]),
    'readinessProjectionWritten': (out / 'readiness.json').exists(),
    'logcatCaptureSummaryWritten': capture_file.exists(),
    'nativeCaptureValid': capture_valid,
}, indent=2) + '\n')
sys.exit(diagnostic_exit)
RESULT
probe_exit=$?
set -e
printf 'Diagnostic exit %s; filtered evidence saved in %s\n' "$probe_exit" "$probe_output"
exit "$probe_exit"
