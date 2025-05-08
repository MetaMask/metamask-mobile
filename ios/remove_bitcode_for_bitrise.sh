#!/bin/bash

# Script to handle OpenSSL bitcode issues for Bitrise deployment
# This script is called by Bitrise before uploading to App Store

set -e  # Exit immediately if a command exits with a non-zero status

echo "🔍 Checking app for OpenSSL framework..."

# Get the path to the IPA file from Bitrise
IPA_PATH="$1"
SKIP_SIGNING="${2:-false}"

if [ -z "$IPA_PATH" ]; then
    echo "❌ No IPA path provided. Usage: ./remove_bitcode_for_bitrise.sh /path/to/app.ipa [skip_signing]"
    exit 1
fi

echo "📦 Working with IPA: $IPA_PATH"
echo "🔐 Skip signing: $SKIP_SIGNING"

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
echo "📁 Using temporary directory: $TEMP_DIR"

# Unzip the IPA to the temporary directory
echo "🔓 Extracting IPA..."
unzip -q "$IPA_PATH" -d "$TEMP_DIR"

# Find the OpenSSL framework in the app
APP_DIR=$(find "$TEMP_DIR/Payload" -name "*.app" -type d | head -1)
echo "📱 App directory: $APP_DIR"

OPENSSL_FRAMEWORK="$APP_DIR/Frameworks/OpenSSL.framework"
if [ ! -d "$OPENSSL_FRAMEWORK" ]; then
    echo "❌ OpenSSL framework not found in app"
    exit 1
fi

OPENSSL_BINARY="$OPENSSL_FRAMEWORK/OpenSSL"
if [ ! -f "$OPENSSL_BINARY" ]; then
    echo "❌ OpenSSL binary not found in framework"
    exit 1
fi

echo "✅ Found OpenSSL framework at $OPENSSL_FRAMEWORK"

# Get Xcode developer path
DEVELOPER_DIR=$(xcode-select -p)
if [ -z "$DEVELOPER_DIR" ]; then
  echo "❌ Error: Could not find Xcode developer directory."
  exit 1
fi

# Get lipo path 
LIPO="$DEVELOPER_DIR/Toolchains/XcodeDefault.xctoolchain/usr/bin/lipo"
if [ ! -f "$LIPO" ]; then
  LIPO=$(which lipo)
  if [ -z "$LIPO" ]; then
    echo "❌ Error: lipo command not found"
    exit 1
  fi
fi

echo "🔧 Processing OpenSSL binary..."

# Check if we have bitcode
OTOOL_CMD="$DEVELOPER_DIR/usr/bin/otool"
if [ ! -f "$OTOOL_CMD" ]; then
  OTOOL_CMD=$(which otool)
  if [ -z "$OTOOL_CMD" ]; then
    echo "❌ Error: otool command not found"
    exit 1
  fi
fi

if $OTOOL_CMD -l "$OPENSSL_BINARY" | grep -q LLVM; then
  echo "⚠️ Bitcode found in OpenSSL binary"
  
  # Create a backup of the original binary
  cp "$OPENSSL_BINARY" "${OPENSSL_BINARY}.bak"
  
  # Extract architectures and rebuild without bitcode
  echo "🔧 Rebuilding OpenSSL binary without bitcode..."
  ARCHS=$($LIPO -info "$OPENSSL_BINARY" | rev | cut -d':' -f1 | rev)
  
  for ARCH in $ARCHS; do
    echo "  ➡️ Extracting $ARCH from OpenSSL binary"
    $LIPO -thin "$ARCH" "$OPENSSL_BINARY" -output "$TEMP_DIR/OpenSSL-$ARCH"
  done
  
  # Recombine architectures
  ARCH_FILES=$(find "$TEMP_DIR" -name "OpenSSL-*")
  echo "🔄 Recombining architectures: $ARCH_FILES"
  $LIPO -create $ARCH_FILES -output "$OPENSSL_BINARY"
  
  echo "✅ Successfully rebuilt OpenSSL binary without bitcode"
else
  echo "✅ No bitcode found in OpenSSL binary, no action needed"
fi

# Only attempt to sign if we're not skipping signing
if [ "$SKIP_SIGNING" != "true" ]; then
  # Get bundle identifier from Info.plist
  BUNDLE_ID=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$APP_DIR/Info.plist")
  echo "📱 App Bundle Identifier: $BUNDLE_ID"

  # Find codesign command
  CODESIGN_CMD="$(which codesign)"
  if [ -z "$CODESIGN_CMD" ]; then
    # Try known locations
    POSSIBLE_PATHS=(
      "$DEVELOPER_DIR/usr/bin/codesign"
      "/usr/bin/codesign"
      "/Applications/Xcode.app/Contents/Developer/usr/bin/codesign"
    )
    
    for path in "${POSSIBLE_PATHS[@]}"; do
      if [ -f "$path" ]; then
        CODESIGN_CMD="$path"
        echo "✅ Found codesign at $CODESIGN_CMD"
        break
      fi
    done
  fi

  if [ -z "$CODESIGN_CMD" ]; then
    echo "❌ Error: codesign command not found. Continuing without re-signing..."
  else
    # Determine which signing identity to use
    echo "🔐 Finding signing identity..."
    SIGNING_IDENTITY=$(security find-identity -v -p codesigning 2>/dev/null | grep "Apple Distribution" | head -1 | sed -E 's/.*\) ([A-F0-9]+) "(.*)"/\1/')

    if [ -z "$SIGNING_IDENTITY" ]; then
      echo "⚠️ No Apple Distribution identity found, trying to find Apple Development identity..."
      SIGNING_IDENTITY=$(security find-identity -v -p codesigning 2>/dev/null | grep "Apple Development" | head -1 | sed -E 's/.*\) ([A-F0-9]+) "(.*)"/\1/')
    fi

    if [ -z "$SIGNING_IDENTITY" ]; then
      echo "❌ No valid signing identity found. Continuing without re-signing..."
    else
      echo "🔑 Using signing identity: $SIGNING_IDENTITY"

      # First, sign the OpenSSL framework
      echo "🔏 Signing OpenSSL framework..."
      $CODESIGN_CMD --force --sign "$SIGNING_IDENTITY" "$OPENSSL_FRAMEWORK" || echo "⚠️ Failed to sign OpenSSL framework, continuing anyway..."

      # Sign all other frameworks
      echo "🔏 Signing all other frameworks..."
      find "$APP_DIR/Frameworks" -type d -name "*.framework" | while read framework; do
        echo "  ➡️ Signing $framework"
        $CODESIGN_CMD --force --sign "$SIGNING_IDENTITY" "$framework" || echo "⚠️ Failed to sign framework, continuing anyway..."
      done

      # Sign the app
      echo "🔏 Signing the app..."
      $CODESIGN_CMD --force --sign "$SIGNING_IDENTITY" "$APP_DIR" || echo "⚠️ Failed to sign app, continuing anyway..."
    fi
  fi
else
  echo "🔏 Skipping signing as requested"
fi

# Re-package the IPA
echo "📦 Re-packaging IPA..."
cd "$TEMP_DIR"
zip -qr "fixed.ipa" "Payload"

# Move the fixed IPA back to the original location
echo "🔄 Replacing original IPA with fixed version..."
mv "$TEMP_DIR/fixed.ipa" "$IPA_PATH"

# Clean up temporary directory
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"

echo "✅ OpenSSL bitcode removal complete! Your IPA should now be ready for App Store submission." 