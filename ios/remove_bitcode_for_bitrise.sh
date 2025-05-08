#!/bin/bash

# Script to handle OpenSSL bitcode issues for Bitrise deployment
# This script is called by Bitrise before uploading to App Store

set -e  # Exit immediately if a command exits with a non-zero status

echo "🔍 Checking app for OpenSSL framework..."

# Get the path to the IPA file from Bitrise
IPA_PATH="$1"

if [ -z "$IPA_PATH" ]; then
    echo "❌ No IPA path provided. Usage: ./remove_bitcode_for_bitrise.sh /path/to/app.ipa"
    exit 1
fi

echo "📦 Working with IPA: $IPA_PATH"

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
  echo "❌ Error: lipo command not found at $LIPO"
  exit 1
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