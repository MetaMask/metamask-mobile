#!/usr/bin/env bash
#
# Build-number surgery for the auto RC repack fast path (.github/workflows/build-rc-repack.yml).
#
# The repack path reuses a previous RC run's signed artifact and only replaces its JS layer.
# @expo/repack-app does not touch version metadata, so the reused artifact would otherwise
# ship with the donor's build number. That is fatal on iOS (App Store Connect rejects a
# duplicate CFBundleShortVersionString + CFBundleVersion pair) and misleading on Android
# (QA reads the build number back from the installed app).
#
# iOS patches must run BEFORE @expo/repack-app, which re-signs as its final step; anything
# written into the app bundle afterwards invalidates that signature.
#
# Subcommands:
#   ios-patch          <ipa> <build-number> <expected-short-version> <extras-dir>
#   ios-restore-extras <ipa> <extras-dir>
#   ios-verify         <ipa> <build-number> <expected-short-version>
#   ios-app-id         <ipa>
#   android-patch      <apk> <out-apk> <build-number> <expected-version-name>
#   android-verify     <apk> <build-number> <expected-version-name>
#   android-app-id     <apk>

set -euo pipefail

APKTOOL_JAR="node_modules/@expo/repack-app/dist/apktool.jar"

# stderr, so the message still surfaces when a helper is called inside $( ).
fail() {
  echo "::error::$1" >&2
  exit 1
}

abs_path() {
  case "$1" in
    /*) printf '%s' "$1" ;;
    *) printf '%s' "$PWD/$1" ;;
  esac
}

find_app_dir() {
  local payload="$1"
  find "$payload" -maxdepth 1 -name '*.app' -type d | head -1
}

# Locate aapt2 from the Android SDK. Used to read version metadata back out of a built APK,
# which is the only check that proves what actually shipped rather than what we intended.
find_aapt2() {
  local sdk_root="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/opt/android-sdk}}"
  local candidate
  candidate=$(find "$sdk_root/build-tools" -maxdepth 2 -name 'aapt2' -type f 2>/dev/null | sort -V | tail -1)
  if [[ -n "$candidate" ]]; then
    printf '%s' "$candidate"
    return 0
  fi
  if command -v aapt2 >/dev/null 2>&1; then
    command -v aapt2
    return 0
  fi
  return 1
}

apk_version_code() {
  local apk="$1" aapt2
  aapt2=$(find_aapt2) || fail "aapt2 not found; cannot verify the APK version code (searched \$ANDROID_SDK_ROOT/build-tools)."
  "$aapt2" dump badging "$apk" \
    | sed -n "s/^package:.*versionCode='\([0-9]*\)'.*/\1/p" \
    | head -1
}

apk_version_name() {
  local apk="$1" aapt2
  aapt2=$(find_aapt2) || fail "aapt2 not found; cannot verify the APK version name (searched \$ANDROID_SDK_ROOT/build-tools)."
  "$aapt2" dump badging "$apk" \
    | sed -n "s/^package:.*versionName='\([^']*\)'.*/\1/p" \
    | head -1
}

# ---------------------------------------------------------------------------------------
# iOS
# ---------------------------------------------------------------------------------------

# Rewrites CFBundleVersion inside the IPA and stashes every top-level entry other than
# Payload/ (SwiftSupport, Symbols, iTunesMetadata.plist, ...). @expo/repack-app rebuilds the
# archive from Payload/ alone, so without this those entries are silently dropped — and a
# missing SwiftSupport folder is an App Store Connect rejection (ITMS-90426) for a Swift app.
# They live outside the signed bundle, so restoring them after signing is safe.
ios_patch() {
  local ipa="$1" build_number="$2" expected_short="$3" extras_dir="$4"
  local ipa_abs work app_dir plist actual_short actual_build

  [[ -f "$ipa" ]] || fail "IPA not found: $ipa"
  ipa_abs=$(abs_path "$ipa")
  work=$(mktemp -d)

  unzip -q "$ipa_abs" -d "$work"
  app_dir=$(find_app_dir "$work/Payload")
  [[ -n "$app_dir" ]] || fail "No .app bundle inside $ipa"
  plist="$app_dir/Info.plist"
  [[ -f "$plist" ]] || fail "No Info.plist inside $app_dir"

  actual_short=$(plutil -extract CFBundleShortVersionString raw -o - "$plist")
  if [[ "$actual_short" != "$expected_short" ]]; then
    fail "Donor IPA is version $actual_short but this branch is on $expected_short. Refusing to repack across release trains."
  fi

  echo "Donor build number: $(plutil -extract CFBundleVersion raw -o - "$plist")"
  plutil -replace CFBundleVersion -string "$build_number" "$plist"
  actual_build=$(plutil -extract CFBundleVersion raw -o - "$plist")
  [[ "$actual_build" == "$build_number" ]] || fail "CFBundleVersion is $actual_build after patching, expected $build_number"
  echo "Patched CFBundleVersion -> $actual_build (CFBundleShortVersionString $actual_short)"

  mkdir -p "$extras_dir"
  local entry
  for entry in "$work"/*; do
    [[ -e "$entry" ]] || continue
    [[ "$(basename "$entry")" == "Payload" ]] && continue
    cp -R "$entry" "$extras_dir/"
    echo "Stashed top-level IPA entry for restore after signing: $(basename "$entry")"
  done

  rm -f "$ipa_abs"
  # -y keeps symlinks as symlinks; frameworks inside the bundle rely on them.
  (cd "$work" && zip -qry "$ipa_abs" .)
  rm -rf "$work"
  echo "Repacked donor IPA with patched version: $ipa_abs"
}

ios_restore_extras() {
  local ipa="$1" extras_dir="$2"
  local ipa_abs

  [[ -f "$ipa" ]] || fail "IPA not found: $ipa"
  ipa_abs=$(abs_path "$ipa")

  if [[ ! -d "$extras_dir" ]] || [[ -z "$(ls -A "$extras_dir" 2>/dev/null)" ]]; then
    echo "No non-Payload entries to restore."
    return 0
  fi

  (cd "$extras_dir" && zip -qry "$ipa_abs" .)
  echo "Restored non-Payload entries into $ipa_abs:"
  find "$extras_dir" -mindepth 1 -maxdepth 1 -exec basename {} \; | sed 's/^/  /'
}

ios_verify() {
  local ipa="$1" build_number="$2" expected_short="$3"
  local work app_dir plist actual_short actual_build app_name

  [[ -f "$ipa" ]] || fail "IPA not found: $ipa"
  work=$(mktemp -d)
  unzip -q "$ipa" -d "$work"

  app_dir=$(find_app_dir "$work/Payload")
  [[ -n "$app_dir" ]] || fail "Repacked IPA has no .app bundle"
  plist="$app_dir/Info.plist"

  actual_short=$(plutil -extract CFBundleShortVersionString raw -o - "$plist")
  actual_build=$(plutil -extract CFBundleVersion raw -o - "$plist")
  [[ "$actual_short" == "$expected_short" ]] || fail "Repacked IPA reports version $actual_short, expected $expected_short"
  [[ "$actual_build" == "$build_number" ]] || fail "Repacked IPA reports build number $actual_build, expected $build_number"

  # @expo/repack-app has been seen to drop the Mach-O binary while rebuilding the bundle
  # (symlink handling); an IPA without it installs and then dies on launch.
  app_name=$(basename "$app_dir" .app)
  [[ -f "$app_dir/$app_name" ]] || fail "Repacked IPA is missing its bundle executable ($app_name)"

  codesign -dv "$app_dir" 2>&1 | sed 's/^/  /'
  codesign --verify --deep --strict "$app_dir" || fail "Repacked IPA failed code signature verification"

  rm -rf "$work"
  echo "Verified repacked IPA: version $actual_short, build $actual_build, signed, executable present."
}

# Printed on stdout only, so callers can capture it. Used to build the Sentry release
# name, which must match what the native build reports or crash reports lose symbolication.
ios_app_id() {
  local ipa="$1" work app_dir app_id

  [[ -f "$ipa" ]] || fail "IPA not found: $ipa"
  work=$(mktemp -d)
  # Only the Info.plist is needed; extracting the whole archive would be wasteful.
  unzip -qo "$ipa" 'Payload/*.app/Info.plist' -d "$work"
  app_dir=$(find_app_dir "$work/Payload")
  [[ -n "$app_dir" ]] || fail "No .app bundle inside $ipa"
  app_id=$(plutil -extract CFBundleIdentifier raw -o - "$app_dir/Info.plist")
  rm -rf "$work"
  printf '%s' "$app_id"
}

# ---------------------------------------------------------------------------------------
# Android
# ---------------------------------------------------------------------------------------

# versionCode lives in the binary manifest, so it is rewritten through apktool's decoded
# apktool.yml. The decode/build flags match the ones @expo/repack-app uses internally on
# this same APK (`decode -s`, i.e. classes.dex copied verbatim), so this cycle is the one
# already exercised by the E2E and BrowserStack repack paths. The output is unsigned;
# @expo/repack-app signs it at the end of its own cycle.
android_patch() {
  local apk="$1" out_apk="$2" build_number="$3" expected_version_name="$4"
  local apk_abs out_abs work decoded yml actual_name

  [[ -f "$apk" ]] || fail "APK not found: $apk"
  [[ -f "$APKTOOL_JAR" ]] || fail "apktool jar not found at $APKTOOL_JAR (is @expo/repack-app installed?)"

  actual_name=$(apk_version_name "$apk")
  if [[ "$actual_name" != "$expected_version_name" ]]; then
    fail "Donor APK is version $actual_name but this branch is on $expected_version_name. Refusing to repack across release trains."
  fi
  echo "Donor version code: $(apk_version_code "$apk")"

  apk_abs=$(abs_path "$apk")
  out_abs=$(abs_path "$out_apk")
  work=$(mktemp -d)
  decoded="$work/decoded-apk"

  java -jar "$(abs_path "$APKTOOL_JAR")" decode "$apk_abs" -s -o "$decoded"

  yml="$decoded/apktool.yml"
  [[ -f "$yml" ]] || fail "apktool.yml missing from decoded APK"
  grep -q 'versionCode:' "$yml" || fail "apktool.yml has no versionCode entry to patch"
  # Quoted so YAML keeps it a string, which is how apktool emits it.
  sed -i.bak -E "s/^([[:space:]]*versionCode:[[:space:]]*).*/\1'${build_number}'/" "$yml"
  rm -f "$yml.bak"
  grep -E '^[[:space:]]*version(Code|Name):' "$yml" | sed 's/^/  /'

  mkdir -p "$(dirname "$out_abs")"
  java -jar "$(abs_path "$APKTOOL_JAR")" build -o "$out_abs" "$decoded"
  rm -rf "$work"

  [[ -f "$out_abs" ]] || fail "apktool build produced no APK at $out_abs"
  echo "Rebuilt donor APK with patched version code: $out_abs"
}

android_verify() {
  local apk="$1" build_number="$2" expected_version_name="$3"
  local actual_code actual_name

  [[ -f "$apk" ]] || fail "APK not found: $apk"
  actual_code=$(apk_version_code "$apk")
  actual_name=$(apk_version_name "$apk")

  [[ "$actual_code" == "$build_number" ]] || fail "Repacked APK reports version code $actual_code, expected $build_number"
  [[ "$actual_name" == "$expected_version_name" ]] || fail "Repacked APK reports version name $actual_name, expected $expected_version_name"

  echo "Verified repacked APK: versionName $actual_name, versionCode $actual_code."
}

android_app_id() {
  local apk="$1" aapt2

  [[ -f "$apk" ]] || fail "APK not found: $apk"
  aapt2=$(find_aapt2) || fail "aapt2 not found; cannot read the APK application id."
  "$aapt2" dump badging "$apk" \
    | sed -n "s/^package: name='\([^']*\)'.*/\1/p" \
    | head -1 \
    | tr -d '\n'
}

# ---------------------------------------------------------------------------------------

command="${1:-}"
shift || true

case "$command" in
  ios-patch)
    [[ $# -eq 4 ]] || fail "Usage: $0 ios-patch <ipa> <build-number> <expected-short-version> <extras-dir>"
    ios_patch "$@"
    ;;
  ios-restore-extras)
    [[ $# -eq 2 ]] || fail "Usage: $0 ios-restore-extras <ipa> <extras-dir>"
    ios_restore_extras "$@"
    ;;
  ios-verify)
    [[ $# -eq 3 ]] || fail "Usage: $0 ios-verify <ipa> <build-number> <expected-short-version>"
    ios_verify "$@"
    ;;
  ios-app-id)
    [[ $# -eq 1 ]] || fail "Usage: $0 ios-app-id <ipa>"
    ios_app_id "$@"
    ;;
  android-patch)
    [[ $# -eq 4 ]] || fail "Usage: $0 android-patch <apk> <out-apk> <build-number> <expected-version-name>"
    android_patch "$@"
    ;;
  android-verify)
    [[ $# -eq 3 ]] || fail "Usage: $0 android-verify <apk> <build-number> <expected-version-name>"
    android_verify "$@"
    ;;
  android-app-id)
    [[ $# -eq 1 ]] || fail "Usage: $0 android-app-id <apk>"
    android_app_id "$@"
    ;;
  *)
    fail "Unknown subcommand '${command}'. Expected one of: ios-patch, ios-restore-extras, ios-verify, ios-app-id, android-patch, android-verify, android-app-id."
    ;;
esac
