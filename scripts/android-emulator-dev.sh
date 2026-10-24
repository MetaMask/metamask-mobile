#!/usr/bin/env bash
# Local Android emulator + MetaMask dev build for a Linux VM.
#
# This is the repeatable path when there is no Android Studio image and no
# real .js.env. It installs the SDK the Gradle file asks for (platform 36,
# build-tools 36.0.0, NDK 27.1.12297006), creates an API 36 x86_64 AVD, and
# builds the dev-environment prodRelease APK (what `yarn build:android:main:dev`
# produces). prodDebug does not embed the JS bundle, so a headless emulator
# cannot launch it without Metro. Pass CONFIGURATION=Debug to build that
# variant instead.
#
# Placeholder files stay gitignored:
#   .js.env, .android.env, android/local.properties, android/app/google-services.json
#
# Usage:
#   scripts/android-emulator-dev.sh sdk       # SDK, system image, AVD
#   scripts/android-emulator-dev.sh env       # placeholder .js.env only
#   scripts/android-emulator-dev.sh build     # timed Gradle build
#   scripts/android-emulator-dev.sh boot      # headless emulator
#   scripts/android-emulator-dev.sh install   # install + launch + screenshot
#   scripts/android-emulator-dev.sh all
#
# A clean build is timed and printed as "clean build seconds: N" when the
# APK was not already present. Later builds reuse Gradle outputs.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/android-sdk}}"
AVD_NAME="${ANDROID_AVD_NAME:-metamask_dev}"
API_LEVEL="${ANDROID_API_LEVEL:-36}"
SYSTEM_IMAGE_TAG="${ANDROID_SYSTEM_IMAGE_TAG:-default}"
ABI="${ANDROID_ABI:-x86_64}"
CONFIGURATION="${CONFIGURATION:-Release}"
BUILD_CONFIG_NAME="${BUILD_CONFIG_NAME:-main-dev}"
CMDLINE_TOOLS_BUILD="${CMDLINE_TOOLS_BUILD:-11076708}"
ARTIFACT_DIR="${ARTIFACT_DIR:-/opt/cursor/artifacts}"
NODE_BIN="${NODE_BIN:-$HOME/.nvm/versions/node/v24.22.1/bin}"

export ANDROID_SDK_ROOT="$SDK_ROOT"
export ANDROID_HOME="$SDK_ROOT"
export PATH="$NODE_BIN:$SDK_ROOT/cmdline-tools/latest/bin:$SDK_ROOT/platform-tools:$SDK_ROOT/emulator:$PATH"
export SENTRY_DISABLE_AUTO_UPLOAD="${SENTRY_DISABLE_AUTO_UPLOAD:-true}"
export EXPO_NO_TYPESCRIPT_SETUP=1
# Public debug keystore already in android/keystores/debug.keystore.
# mainDev signing reads these names. They are not production secrets.
export ANDROID_SIGNING_KEYSTORE_PASSWORD="${ANDROID_SIGNING_KEYSTORE_PASSWORD:-android}"
export BITRISEIO_ANDROID_MAIN_KEYSTORE_ALIAS="${BITRISEIO_ANDROID_MAIN_KEYSTORE_ALIAS:-androiddebugkey}"
export BITRISEIO_ANDROID_MAIN_KEYSTORE_PRIVATE_KEY_PASSWORD="${BITRISEIO_ANDROID_MAIN_KEYSTORE_PRIVATE_KEY_PASSWORD:-android}"

if [[ -r /dev/kvm && ! -w /dev/kvm ]]; then
  sudo chmod 666 /dev/kvm || true
fi

log() { printf '\n==> %s\n' "$*"; }

install_host_packages() {
  if ! command -v sdkmanager >/dev/null 2>&1 || ! dpkg -s libpulse0 >/dev/null 2>&1; then
    log "Installing emulator host libraries"
    sudo apt-get update -qq
    sudo apt-get install -y --no-install-recommends \
      unzip curl ca-certificates \
      libpulse0 libglu1-mesa libnss3 libxss1 \
      libx11-6 libxcomposite1 libxcursor1 libxi6 libxtst6 libxcb1
  fi
}

install_cmdline_tools() {
  local sdkmanager="$SDK_ROOT/cmdline-tools/latest/bin/sdkmanager"
  if [[ -x "$sdkmanager" ]]; then
    return
  fi
  log "Installing Android cmdline-tools $CMDLINE_TOOLS_BUILD"
  mkdir -p "$SDK_ROOT"
  local zip
  zip="$(mktemp)"
  curl -fsSL -o "$zip" \
    "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_BUILD}_latest.zip"
  rm -rf "$SDK_ROOT/cmdline-tools"
  unzip -q "$zip" -d "$SDK_ROOT/cmdline-tools-staging"
  rm -f "$zip"
  mkdir -p "$SDK_ROOT/cmdline-tools"
  mv "$SDK_ROOT/cmdline-tools-staging/cmdline-tools" "$SDK_ROOT/cmdline-tools/latest"
  rm -rf "$SDK_ROOT/cmdline-tools-staging"
}

accept_licenses() {
  local sdkmanager="$SDK_ROOT/cmdline-tools/latest/bin/sdkmanager"
  set +o pipefail
  yes | "$sdkmanager" --sdk_root="$SDK_ROOT" --licenses >/dev/null
  set -o pipefail
}

install_sdk_packages() {
  local sdkmanager="$SDK_ROOT/cmdline-tools/latest/bin/sdkmanager"
  local image="system-images;android-${API_LEVEL};${SYSTEM_IMAGE_TAG};${ABI}"
  log "Installing SDK packages (NDK 27.1.12297006, platform ${API_LEVEL}, ${image})"
  "$sdkmanager" --sdk_root="$SDK_ROOT" \
    "platform-tools" \
    "emulator" \
    "platforms;android-${API_LEVEL}" \
    "build-tools;36.0.0" \
    "ndk;27.1.12297006" \
    "cmake;3.22.1" \
    "$image"
}

create_avd() {
  local image="system-images;android-${API_LEVEL};${SYSTEM_IMAGE_TAG};${ABI}"
  local avdmanager="$SDK_ROOT/cmdline-tools/latest/bin/avdmanager"
  if [[ -d "$HOME/.android/avd/${AVD_NAME}.avd" ]]; then
    log "AVD ${AVD_NAME} already exists"
    return
  fi
  log "Creating AVD ${AVD_NAME} (${image})"
  echo no | "$avdmanager" --verbose create avd \
    --force \
    --name "$AVD_NAME" \
    --package "$image" \
    --device "pixel_5" \
    --abi "$ABI"
  # Headless boot does not need a 10 GB guest. 4 GB leaves room for Gradle.
  printf '\nhw.ramSize=4096\nhw.keyboard=yes\n' >> "$HOME/.android/avd/${AVD_NAME}.avd/config.ini"
}

write_placeholder_google_services() {
  local json="$REPO_ROOT/android/app/google-services.json"
  if [[ -f "$json" ]]; then
    return
  fi
  log "Writing placeholder android/app/google-services.json (gitignored)"
  cat >"$json" <<'EOF'
{
  "project_info": {
    "project_number": "000000000000",
    "project_id": "metamask-local-placeholder",
    "storage_bucket": "metamask-local-placeholder.appspot.com"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:000000000000:android:0000000000000000000000",
        "android_client_info": {
          "package_name": "io.metamask"
        }
      },
      "oauth_client": [],
      "api_key": [{ "current_key": "local-placeholder" }],
      "services": { "appinvite_service": { "other_platform_oauth_client": [] } }
    }
  ],
  "configuration_version": "1"
}
EOF
}

write_local_env() {
  cd "$REPO_ROOT"
  if [[ ! -f .android.env ]]; then
    cp .android.env.example .android.env
  fi
  if [[ ! -f .js.env ]]; then
    log "Creating .js.env from .js.env.example with local placeholders"
    cp .js.env.example .js.env
  fi
  write_placeholder_google_services
  local b64
  b64="$(base64 -w0 "$REPO_ROOT/android/app/google-services.json")"
  # Append only when missing so a re-run does not duplicate exports.
  grep -q '^export GOOGLE_SERVICES_B64_ANDROID=' .js.env || \
    printf '\nexport GOOGLE_SERVICES_B64_ANDROID="%s"\n' "$b64" >> .js.env
  grep -q '^export MM_SOCIAL_POST_TRANSLATION_ENABLED=' .js.env || \
    printf 'export MM_SOCIAL_POST_TRANSLATION_ENABLED="true"\n' >> .js.env
  # The example defaults this to false. Force the local stub on for this VM.
  sed -i 's/^export MM_SOCIAL_POST_TRANSLATION_ENABLED=.*/export MM_SOCIAL_POST_TRANSLATION_ENABLED="true"/' .js.env
  grep -q '^export SENTRY_DISABLE_AUTO_UPLOAD=' .js.env || \
    printf 'export SENTRY_DISABLE_AUTO_UPLOAD="true"\n' >> .js.env
  printf 'sdk.dir=%s\n' "$SDK_ROOT" > "$REPO_ROOT/android/local.properties"
}

load_build_env() {
  cd "$REPO_ROOT"
  write_local_env
  set -a
  # shellcheck disable=SC1091
  source .js.env
  set +a
  # builds.yml dev env wins over empty example values, then local placeholders win again.
  # shellcheck disable=SC1090
  eval "$(node scripts/apply-build-config.js "$BUILD_CONFIG_NAME" --export)"
  set -a
  # shellcheck disable=SC1091
  source .js.env
  set +a
  export METAMASK_ENVIRONMENT="${METAMASK_ENVIRONMENT:-dev}"
  export METAMASK_BUILD_TYPE="${METAMASK_BUILD_TYPE:-main}"
  export SENTRY_DISABLE_AUTO_UPLOAD=true
  export ANDROID_SIGNING_KEYSTORE_PASSWORD
  export BITRISEIO_ANDROID_MAIN_KEYSTORE_ALIAS
  export BITRISEIO_ANDROID_MAIN_KEYSTORE_PRIVATE_KEY_PASSWORD
  export MM_SOCIAL_POST_TRANSLATION_ENABLED=true
}

prepare_native_assets() {
  cd "$REPO_ROOT"
  if [[ ! -f app/core/InpageBridgeWeb3.js ]]; then
    log "Building InpageBridgeWeb3.js (generated, not committed)"
    bash scripts/build-inpage-bridge.sh
  fi
  mkdir -p android/app/src/main/assets/fonts
  cp -f app/core/InpageBridgeWeb3.js android/app/src/main/assets/InpageBridgeWeb3.js
  if [[ -f app/fonts/Metamask.ttf ]]; then
    cp -f app/fonts/Metamask.ttf android/app/src/main/assets/fonts/Metamask.ttf
  fi
  node scripts/update-expo-channel.js
}

build_apk() {
  load_build_env
  prepare_native_assets
  local flavor_config apk
  if [[ "$CONFIGURATION" == "Debug" ]]; then
    flavor_config="prod/debug"
    apk="app-prod-debug.apk"
  else
    flavor_config="prod/release"
    apk="app-prod-release.apk"
  fi
  local apk_path="$REPO_ROOT/android/app/build/outputs/apk/${flavor_config}/${apk}"
  local task="app:assembleProd${CONFIGURATION}"
  local clean_build=0
  if [[ ! -f "$apk_path" ]]; then
    clean_build=1
  fi
  log "Building ${task} for ${ABI} (clean=${clean_build})"
  local start end
  start="$(date +%s)"
  # The repo default heap is 4g, which GC-thrashes while R8 shrinks this app.
  # -Dorg.gradle.jvmargs is a daemon start flag and wins over gradle.properties.
  # Vital lint is not required to produce an installable APK and OOMs in the same heap.
  (
    cd "$REPO_ROOT/android"
    ./gradlew --stop >/dev/null 2>&1 || true
    ./gradlew "$task" \
      -PreactNativeArchitectures="$ABI" \
      -Dorg.gradle.jvmargs="-Xmx10g -XX:MaxMetaspaceSize=1g -XX:+UseParallelGC" \
      -x lintVitalAnalyzeRelease \
      -x lintVitalAnalyzeProdRelease \
      --stacktrace
  )
  end="$(date +%s)"
  local seconds=$((end - start))
  log "Gradle seconds: ${seconds}"
  # "clean" only when Gradle did not reuse a previous native compile.
  # The first from-scratch run compiles every native module; a later run
  # that only finishes R8/packaging is an incremental rebuild.
  if [[ "$clean_build" == "1" ]]; then
    log "APK was absent at start. Gradle seconds above include incremental reuse when a previous attempt already compiled native code."
    printf '%s\n' "$seconds" > /tmp/android-gradle-seconds.txt
  fi
  ls -lh "$apk_path"
}

boot_emulator() {
  local emulator_bin="$SDK_ROOT/emulator/emulator"
  if adb devices | awk 'NR>1 && $2=="device" { found=1 } END { exit !found }'; then
    log "An emulator is already online"
    return
  fi
  # -accel on crashes this VM's KVM (kvm_spurious_fault / qemu signal 6).
  # Default to off here. Set ANDROID_EMULATOR_ACCEL=on where nested KVM works.
  local accel="${ANDROID_EMULATOR_ACCEL:-off}"
  local -a wipe_flags=()
  if [[ "${ANDROID_EMULATOR_WIPE:-}" == "1" ]]; then
    wipe_flags=(-wipe-data)
  fi
  log "Booting ${AVD_NAME} headless (swiftshader, accel=${accel})"
  # setsid so the emulator survives this script exiting (tmux would
  # otherwise signal the process group and shut the guest down).
  setsid nohup "$emulator_bin" \
    -avd "$AVD_NAME" \
    -port 5554 \
    -no-window \
    -no-audio \
    -no-boot-anim \
    -no-snapshot-load \
    -no-snapshot-save \
    "${wipe_flags[@]}" \
    -gpu swiftshader_indirect \
    -accel "$accel" \
    -memory 3072 \
    -cores 4 \
    -skin 1080x2340 \
    -dns-server 8.8.8.8 \
    -partition-size 4096 \
    > /tmp/metamask-emulator.log 2>&1 < /dev/null &
  echo $! > /tmp/metamask-emulator.pid
  disown || true
  adb wait-for-device
  local i
  for i in $(seq 1 90); do
    if [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
      log "Emulator boot_completed"
      adb shell input keyevent 82 || true
      return
    fi
    sleep 5
  done
  echo "Emulator did not finish booting. See /tmp/metamask-emulator.log" >&2
  tail -n 80 /tmp/metamask-emulator.log >&2 || true
  exit 1
}

install_and_screenshot() {
  mkdir -p "$ARTIFACT_DIR"
  local flavor_config apk
  if [[ "$CONFIGURATION" == "Debug" ]]; then
    flavor_config="prod/debug"
    apk="app-prod-debug.apk"
  else
    flavor_config="prod/release"
    apk="app-prod-release.apk"
  fi
  local apk_path="$REPO_ROOT/android/app/build/outputs/apk/${flavor_config}/${apk}"
  if [[ ! -f "$apk_path" ]]; then
    echo "APK missing: $apk_path" >&2
    exit 1
  fi
  log "Installing $apk_path"
  adb install -r -d "$apk_path"
  adb shell am force-stop io.metamask || true
  adb shell am start -n io.metamask/.MainActivity
  # First launch of a release bundle can spend a while in Hermes startup.
  local i
  for i in $(seq 1 24); do
    sleep 5
    if adb shell pidof io.metamask >/dev/null 2>&1; then
      break
    fi
  done
  sleep 8
  local shot="$ARTIFACT_DIR/android_furthest_screen.png"
  # adb screencap goes black on this host after the first frames.
  # The emulator console writes a real PNG on the host.
  local token_file="$HOME/.emulator_console_auth_token"
  if [[ -f "$token_file" ]]; then
    python3 - "$token_file" "$shot" <<'PY'
import socket, sys
token = open(sys.argv[1]).read().strip()
out = sys.argv[2]
s = socket.create_connection(("127.0.0.1", 5554), timeout=20)
s.recv(512)
s.sendall(f"auth {token}\n".encode())
s.recv(512)
s.sendall(f"screenrecord screenshot {out}\n".encode())
s.recv(512)
s.sendall(b"quit\n")
s.close()
PY
  else
    adb exec-out screencap -p > "$shot"
  fi
  log "Screenshot $shot"
  adb shell dumpsys activity activities | awk '/mResumedActivity|topResumedActivity/ { print; exit }' || true
  log "Recent errors"
  adb logcat -d -t 120 '*:E' | tail -n 80 || true
}

cmd="${1:-all}"
install_host_packages
case "$cmd" in
  sdk)
    install_cmdline_tools
    accept_licenses
    install_sdk_packages
    create_avd
    ;;
  env)
    write_local_env
    ;;
  build)
    install_cmdline_tools
    build_apk
    ;;
  boot)
    boot_emulator
    ;;
  install)
    boot_emulator
    install_and_screenshot
    ;;
  all)
    install_cmdline_tools
    accept_licenses
    install_sdk_packages
    create_avd
    build_apk
    boot_emulator
    install_and_screenshot
    ;;
  *)
    echo "Unknown command: $cmd" >&2
    exit 1
    ;;
esac
