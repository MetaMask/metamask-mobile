#!/usr/bin/env bash
# Signs an artifact that was compiled without a certificate.
# Run from the workflow commit, after configure-signing. Do not check out
# the branch being built: this script is the only code that should see the key.
set -euo pipefail

if [ -z "${PLATFORM:-}" ] || [ -z "${METAMASK_ENVIRONMENT:-}" ] || [ -z "${METAMASK_BUILD_TYPE:-}" ]; then
  echo "::error::PLATFORM, METAMASK_ENVIRONMENT, and METAMASK_BUILD_TYPE are required"
  exit 1
fi

PROFILE="${PROFILE:-release}"
IS_SIM_BUILD="${IS_SIM_BUILD:-false}"
IS_DEVICE_BUILD="${IS_DEVICE_BUILD:-false}"

sign_android() {
  local store_pw alias key_pw
  case "${METAMASK_BUILD_TYPE}:${METAMASK_ENVIRONMENT}" in
    main:production)
      store_pw="${BITRISEIO_ANDROID_KEYSTORE_PASSWORD:-}"
      alias="${BITRISEIO_ANDROID_KEYSTORE_ALIAS:-}"
      key_pw="${BITRISEIO_ANDROID_KEYSTORE_PRIVATE_KEY_PASSWORD:-}"
      ;;
    main:rc|main:beta)
      store_pw="${BITRISEIO_ANDROID_RC_KEYSTORE_PASSWORD:-}"
      alias="${BITRISEIO_ANDROID_RC_KEYSTORE_ALIAS:-}"
      key_pw="${BITRISEIO_ANDROID_RC_KEYSTORE_PRIVATE_KEY_PASSWORD:-}"
      ;;
    main:exp|main:test|main:e2e)
      store_pw="${BITRISEIO_ANDROID_QA_KEYSTORE_PASSWORD:-}"
      alias="${BITRISEIO_ANDROID_QA_KEYSTORE_ALIAS:-}"
      key_pw="${BITRISEIO_ANDROID_QA_KEYSTORE_PRIVATE_KEY_PASSWORD:-}"
      ;;
    main:dev)
      store_pw="${ANDROID_SIGNING_KEYSTORE_PASSWORD:-}"
      alias="${BITRISEIO_ANDROID_MAIN_KEYSTORE_ALIAS:-}"
      key_pw="${BITRISEIO_ANDROID_MAIN_KEYSTORE_PRIVATE_KEY_PASSWORD:-}"
      ;;
    flask:production)
      store_pw="${BITRISEIO_ANDROID_FLASK_KEYSTORE_PASSWORD:-}"
      alias="${BITRISEIO_ANDROID_FLASK_KEYSTORE_ALIAS:-}"
      key_pw="${BITRISEIO_ANDROID_FLASK_KEYSTORE_PRIVATE_KEY_PASSWORD:-}"
      ;;
    flask:*)
      store_pw="${BITRISEIO_ANDROID_FLASK_UAT_KEYSTORE_PASSWORD:-}"
      alias="${BITRISEIO_ANDROID_FLASK_UAT_KEYSTORE_ALIAS:-}"
      key_pw="${BITRISEIO_ANDROID_FLASK_UAT_KEYSTORE_PRIVATE_KEY_PASSWORD:-}"
      ;;
    *)
      echo "::error::No Android signer mapping for ${METAMASK_BUILD_TYPE}:${METAMASK_ENVIRONMENT}"
      exit 1
      ;;
  esac

  if [ -z "$store_pw" ] || [ -z "$alias" ] || [ -z "$key_pw" ]; then
    echo "::error::Android signing secret is missing a password or alias"
    exit 1
  fi

  local ks="android/keystores/${ANDROID_KEYSTORE_PATH:-}"
  if [ ! -f "$ks" ]; then
    echo "::error::Keystore not found at ${ks}"
    exit 1
  fi

  local sdk="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
  local apksigner
  apksigner="$(find "$sdk/build-tools" -name apksigner -type f 2>/dev/null | sort | tail -1 || true)"
  if [ -z "$apksigner" ]; then
    echo "::error::apksigner not found under ${sdk}/build-tools"
    exit 1
  fi

  local unsigned signed_dir="signed-android"
  unsigned="$(find unsigned-android -name '*.apk' -type f | head -1 || true)"
  if [ -z "$unsigned" ]; then
    echo "::error::No unsigned APK downloaded"
    exit 1
  fi
  mkdir -p "$signed_dir"
  "$apksigner" sign \
    --ks "$ks" \
    --ks-pass "pass:${store_pw}" \
    --ks-key-alias "$alias" \
    --key-pass "pass:${key_pw}" \
    --out "$signed_dir/$(basename "$unsigned")" \
    "$unsigned"
  "$apksigner" verify "$signed_dir/$(basename "$unsigned")"

  local unsigned_aab
  unsigned_aab="$(find unsigned-android-aab -name '*.aab' -type f 2>/dev/null | head -1 || true)"
  if [ -n "$unsigned_aab" ]; then
    mkdir -p signed-android-aab
    jarsigner -sigalg SHA256withRSA -digestalg SHA-256 \
      -keystore "$ks" \
      -storepass "$store_pw" \
      -keypass "$key_pw" \
      -signedjar "signed-android-aab/$(basename "$unsigned_aab")" \
      "$unsigned_aab" \
      "$alias"
  fi
}

sign_ios() {
  if [ "$IS_DEVICE_BUILD" != "true" ]; then
    echo "Simulator-only build; no device signature to apply"
    exit 0
  fi
  if [ "$IOS_ARCHIVE_DOWNLOADED" != "true" ]; then
    echo "::error::Device build did not produce an xcarchive"
    exit 1
  fi

  local zip archive app identity plist scheme
  zip="$(find unsigned-ios -name '*.xcarchive.zip' -type f | head -1 || true)"
  if [ -z "$zip" ]; then
    echo "::error::No xcarchive zip downloaded"
    exit 1
  fi
  unzip -q "$zip" -d unsigned-ios/extracted
  archive="$(find unsigned-ios/extracted -name '*.xcarchive' -type d | head -1 || true)"
  app="$(find "$archive/Products/Applications" -maxdepth 1 -name '*.app' -type d | head -1 || true)"
  identity="$(security find-identity -v -p codesigning "$RUNNER_TEMP/app-signing.keychain-db" | sed -n 's/.*"\(.*\)"/\1/p' | head -1)"
  if [ -z "$identity" ]; then
    echo "::error::No code signing identity in the signing keychain"
    exit 1
  fi

  # Sign nested code first, then the app. The key stays non-extractable.
  while IFS= read -r nested; do
    codesign --force --sign "$identity" --timestamp=none "$nested"
  done < <(find "$app" -type d \( -name '*.framework' -o -name '*.appex' -o -name '*.app' \) ! -path "$app")
  codesign --force --sign "$identity" --timestamp=none "$app"

  if [ "$METAMASK_BUILD_TYPE" = "flask" ] && [ "$PROFILE" = "development" ]; then
    plist="ios/MetaMask/IosExportOptionsMetaMaskFlaskDevelopment.plist"
  elif [ "$METAMASK_BUILD_TYPE" = "flask" ]; then
    plist="ios/MetaMask/IosExportOptionsMetaMaskFlaskRelease.plist"
  elif [ "$PROFILE" = "development" ]; then
    plist="ios/MetaMask/IosExportOptionsMetaMaskDevelopment.plist"
  else
    plist="ios/MetaMask/IosExportOptionsMetaMaskRelease.plist"
  fi

  mkdir -p signed-ios
  xcodebuild -exportArchive \
    -archivePath "$archive" \
    -exportPath signed-ios \
    -exportOptionsPlist "$plist"
}

case "$PLATFORM" in
  android) sign_android ;;
  ios) sign_ios ;;
  *)
    echo "::error::Unknown platform ${PLATFORM}"
    exit 1
    ;;
esac
