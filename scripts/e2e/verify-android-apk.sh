#!/usr/bin/env bash
# Verify a downloaded Android E2E APK is a complete, parseable archive.
#
# CI has produced truncated/corrupt APK artifacts that only fail later on the
# device with INSTALL_PARSE_FAILED_NOT_APK. Checking here lets the workflow
# re-download before booting tests.
#
# Usage: verify-android-apk.sh <apk-path> [min-bytes]
# Exits 0 when the APK looks valid, 1 otherwise.
set -uo pipefail

APK_PATH="${1:-}"
MIN_BYTES="${2:-1000000}"

if [[ -z "${APK_PATH}" ]]; then
  echo "verify-android-apk.sh: APK path argument is required" >&2
  exit 1
fi

if [[ ! -f "${APK_PATH}" ]]; then
  echo "APK is missing: ${APK_PATH}" >&2
  exit 1
fi

APK_SIZE=$(wc -c <"${APK_PATH}" | tr -d '[:space:]')
if [[ "${APK_SIZE}" -lt "${MIN_BYTES}" ]]; then
  echo "APK ${APK_PATH} is ${APK_SIZE} bytes, below the ${MIN_BYTES} byte minimum (truncated download)" >&2
  exit 1
fi

# APKs are zip archives — a partial download usually loses the PK\x03\x04 header.
MAGIC=$(head -c 4 "${APK_PATH}" | od -An -tx1 | tr -d '[:space:]')
if [[ "${MAGIC}" != "504b0304" ]]; then
  echo "APK ${APK_PATH} does not start with a zip header (got ${MAGIC}); artifact is corrupt" >&2
  exit 1
fi

# Reading the central directory catches truncation that the header check misses.
if command -v unzip >/dev/null 2>&1; then
  if ! unzip -l "${APK_PATH}" >/dev/null 2>&1; then
    echo "APK ${APK_PATH} has an unreadable zip central directory; artifact is corrupt" >&2
    exit 1
  fi
fi

echo "APK ${APK_PATH} looks valid (${APK_SIZE} bytes)"
