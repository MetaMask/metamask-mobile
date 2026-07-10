#!/bin/bash

# Shared device targeting for expo dev-app install scripts.
# Reads slot-specific targets from .js.env (same as scripts/build.sh):
#   IOS_SIMULATOR  — simulator name (e.g. mm-1); boots if needed
#   ADB_SERIAL     — adb serial (e.g. emulator-5554); takes precedence on Android
#   ANDROID_DEVICE — AVD name or emulator serial when ADB_SERIAL is unset

dev_load_js_env() {
  local js_env_file="${REPO_ROOT:?REPO_ROOT must be set}/.js.env"
  if [[ -f "$js_env_file" ]]; then
    # Strip CR so a CRLF .js.env (common on Windows/Git Bash) doesn't leave
    # trailing \r in exported values like ADB_SERIAL. No-op on LF files.
    # shellcheck disable=SC1090
    set -a
    source <(tr -d '\r' < "$js_env_file")
    set +a
  fi
}

dev_require_jq() {
  if ! command -v jq &> /dev/null; then
    echo "❌ jq is required but not installed"
    echo "Install with: brew install jq (macOS) / winget install jqlang.jq (Windows)"
    exit 1
  fi
}

dev_get_ios_simulator_udid_by_name() {
  local device_name="$1"
  xcrun simctl list devices available -j | jq -r --arg name "$device_name" '
    [.devices[][] | select(.name == $name)] as $matches |
    (($matches | map(select(.state == "Booted")) | first) // ($matches | first)) |
    .udid // empty
  '
}

dev_is_ios_simulator_booted() {
  local udid="$1"
  xcrun simctl list devices available -j | jq -e --arg udid "$udid" '
    [.devices[][] | select(.udid == $udid and .state == "Booted")] | length > 0
  ' > /dev/null
}

dev_boot_ios_simulator() {
  local udid="$1"
  local device_name="$2"

  if dev_is_ios_simulator_booted "$udid"; then
    echo -e "${GREEN}✓ iOS simulator \"${device_name}\" (${udid}) is already booted${NC}" >&2
    return 0
  fi

  echo -e "${BLUE}Booting iOS simulator: ${device_name} (${udid})${NC}" >&2
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b >&2
  open -a Simulator --args -CurrentDeviceUDID "$udid" 2>/dev/null || open -a Simulator
  echo -e "${GREEN}✓ iOS simulator \"${device_name}\" is booted and ready${NC}" >&2
}

# Prints the target simulator UDID to stdout.
dev_resolve_ios_simulator_udid() {
  dev_load_js_env
  dev_require_jq

  if [[ -n "${IOS_SIMULATOR:-}" ]]; then
    local udid
    udid=$(dev_get_ios_simulator_udid_by_name "$IOS_SIMULATOR")
    if [[ -z "$udid" ]]; then
      echo -e "${RED}❌ iOS simulator \"${IOS_SIMULATOR}\" not found${NC}" >&2
      echo -e "${YELLOW}Set IOS_SIMULATOR in .js.env or run: xcrun simctl list devices available${NC}" >&2
      exit 1
    fi

    echo -e "${BLUE}Using IOS_SIMULATOR from .js.env: ${IOS_SIMULATOR}${NC}" >&2
    dev_boot_ios_simulator "$udid" "$IOS_SIMULATOR"
    echo "$udid"
    return 0
  fi

  local booted_udid booted_name
  booted_udid=$(xcrun simctl list devices booted -j | jq -r '
    [.devices[][] | select(.state == "Booted")] | first | .udid // empty
  ')
  if [[ -z "$booted_udid" ]]; then
    echo -e "${RED}❌ No simulator is currently running.${NC}" >&2
    echo -e "${YELLOW}Set IOS_SIMULATOR in .js.env or boot a simulator first.${NC}" >&2
    exit 1
  fi

  booted_name=$(xcrun simctl list devices booted -j | jq -r --arg udid "$booted_udid" '
    [.devices[][] | select(.udid == $udid)] | first | .name // "unknown"
  ')
  echo -e "${YELLOW}IOS_SIMULATOR not set in .js.env — using booted simulator: ${booted_name} (${booted_udid})${NC}" >&2
  echo "$booted_udid"
}

dev_android_serial_is_ready() {
  local serial="$1"
  # tr -d '\r' strips the trailing CR that adb.exe emits on Windows/Git Bash,
  # otherwise the == "device" test always fails even when the device is ready.
  [[ "$(adb -s "$serial" get-state 2>/dev/null | tr -d '\r' || true)" == "device" ]]
}

dev_list_android_device_serials() {
  # tr -d '\r' so this works on Windows/Git Bash where adb.exe emits CRLF
  # and the awk /device$/ anchor would otherwise miss `device\r`.
  adb devices | tr -d '\r' | awk '/^[^ ]+[[:space:]]+device$/ { print $1 }'
}

dev_resolve_android_serial_from_avd_name() {
  local avd_name="$1"
  local serial avd

  while IFS= read -r serial; do
    [[ -z "$serial" ]] && continue
    avd=$(adb -s "$serial" emu avd name 2>/dev/null | head -1 | tr -d '\r')
    if [[ "$avd" == "$avd_name" ]]; then
      echo "$serial"
      return 0
    fi
  done < <(dev_list_android_device_serials)

  return 1
}

# Prints the target adb serial to stdout.
dev_resolve_android_adb_serial() {
  dev_load_js_env

  if ! command -v adb &> /dev/null; then
    echo -e "${RED}❌ adb not found. Ensure Android SDK platform-tools are on PATH.${NC}" >&2
    exit 1
  fi

  if [[ -n "${ADB_SERIAL:-}" ]]; then
    if ! dev_android_serial_is_ready "$ADB_SERIAL"; then
      echo -e "${RED}❌ ADB_SERIAL from .js.env is not connected: ${ADB_SERIAL}${NC}" >&2
      echo -e "${YELLOW}Start the emulator/device or update ADB_SERIAL in .js.env${NC}" >&2
      exit 1
    fi
    echo -e "${BLUE}Using ADB_SERIAL from .js.env: ${ADB_SERIAL}${NC}" >&2
    echo "$ADB_SERIAL"
    return 0
  fi

  if [[ -n "${ANDROID_DEVICE:-}" ]]; then
    local serial=""
    if [[ "$ANDROID_DEVICE" =~ ^emulator-[0-9]+$ ]]; then
      serial="$ANDROID_DEVICE"
    else
      serial=$(dev_resolve_android_serial_from_avd_name "$ANDROID_DEVICE" || true)
    fi

    if [[ -z "$serial" ]] || ! dev_android_serial_is_ready "$serial"; then
      echo -e "${RED}❌ ANDROID_DEVICE from .js.env is not available: ${ANDROID_DEVICE}${NC}" >&2
      echo -e "${YELLOW}Start the matching emulator or set ADB_SERIAL in .js.env${NC}" >&2
      exit 1
    fi

    echo -e "${BLUE}Using ANDROID_DEVICE from .js.env: ${ANDROID_DEVICE} (${serial})${NC}" >&2
    echo "$serial"
    return 0
  fi

  local fallback_serial
  fallback_serial=$(dev_list_android_device_serials | head -1 || true)
  if [[ -z "$fallback_serial" ]]; then
    echo -e "${RED}❌ No emulator/device in 'device' state.${NC}" >&2
    echo -e "${YELLOW}Set ADB_SERIAL or ANDROID_DEVICE in .js.env, or start an Android emulator.${NC}" >&2
    exit 1
  fi

  echo -e "${YELLOW}ADB_SERIAL / ANDROID_DEVICE not set in .js.env — using first connected device: ${fallback_serial}${NC}" >&2
  echo "$fallback_serial"
}
