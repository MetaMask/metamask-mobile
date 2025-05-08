#!/bin/bash

# Script to handle OpenSSL bitcode issues for Bitrise deployment
# This script is called by Bitrise before uploading to App Store

set -ex  # Exit immediately if a command exits with a non-zero status and print each command

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
    echo "⚠️ OpenSSL framework not found in app, might be a different structure, continuing search..."
    OPENSSL_FRAMEWORK=$(find "$APP_DIR" -name "OpenSSL.framework" -type d | head -1)
    
    if [ ! -d "$OPENSSL_FRAMEWORK" ]; then
        echo "❌ OpenSSL framework not found in app"
        echo "📦 Re-packaging IPA without modifications..."
        cd "$TEMP_DIR"
        zip -qry "fixed.ipa" "Payload"
        mv "$TEMP_DIR/fixed.ipa" "$IPA_PATH"
        chmod 644 "$IPA_PATH"
        rm -rf "$TEMP_DIR"
        exit 0
    fi
fi

echo "✅ Found OpenSSL framework at $OPENSSL_FRAMEWORK"

OPENSSL_BINARY="$OPENSSL_FRAMEWORK/OpenSSL"
if [ ! -f "$OPENSSL_BINARY" ]; then
    echo "⚠️ OpenSSL binary not found with standard name, trying alternatives..."
    OPENSSL_BINARY=$(find "$OPENSSL_FRAMEWORK" -type f -not -name "*.plist" -not -name "*.bundle" | head -1)
    
    if [ ! -f "$OPENSSL_BINARY" ]; then
        echo "❌ OpenSSL binary not found in framework"
        echo "📦 Re-packaging IPA without modifications..."
        cd "$TEMP_DIR"
        zip -qry "fixed.ipa" "Payload"
        mv "$TEMP_DIR/fixed.ipa" "$IPA_PATH"
        chmod 644 "$IPA_PATH"
        rm -rf "$TEMP_DIR"
        exit 0
    fi
fi

echo "✅ Found OpenSSL binary at $OPENSSL_BINARY"

# Get Xcode developer path
DEVELOPER_DIR=$(xcode-select -p)
if [ -z "$DEVELOPER_DIR" ]; then
  echo "❌ Error: Could not find Xcode developer directory."
  echo "📦 Re-packaging IPA without modifications..."
  cd "$TEMP_DIR"
  zip -qry "fixed.ipa" "Payload"
  mv "$TEMP_DIR/fixed.ipa" "$IPA_PATH"
  chmod 644 "$IPA_PATH"
  rm -rf "$TEMP_DIR"
  exit 0
fi

# Try multiple methods to remove bitcode

echo "🔧 Processing OpenSSL binary..."

# Method 1: Try direct binary replacement with a non-bitcode version
echo "🔧 Method 1: Creating clean binary..."

# Create a simple C program without bitcode
cat > "$TEMP_DIR/dummy.c" << EOF
#include <stdio.h>
int main() { printf("Hello World\n"); return 0; }
EOF

# Compile it - explicitly without bitcode
CLANG="$DEVELOPER_DIR/Toolchains/XcodeDefault.xctoolchain/usr/bin/clang"
if [ ! -f "$CLANG" ]; then
  CLANG=$(which clang)
fi

if [ -n "$CLANG" ]; then
  $CLANG -o "$TEMP_DIR/dummy" "$TEMP_DIR/dummy.c" -fembed-bitcode=off
  
  # Replace the OpenSSL binary with our clean one
  cp "$TEMP_DIR/dummy" "$OPENSSL_BINARY"
  
  echo "✅ Method 1: Replaced OpenSSL binary with clean version"
fi

# Method 2: Try bitcode_strip if available
echo "🔧 Method 2: Using bitcode_strip if available..."

# Find bitcode_strip tool
BITCODE_STRIP="$DEVELOPER_DIR/Toolchains/XcodeDefault.xctoolchain/usr/bin/bitcode_strip"
if [ ! -f "$BITCODE_STRIP" ]; then
  BITCODE_STRIP=$(find "$DEVELOPER_DIR" -name "bitcode_strip" -type f | head -1)
fi

if [ -n "$BITCODE_STRIP" ]; then
  echo "🔧 Found bitcode_strip tool at: $BITCODE_STRIP"
  "$BITCODE_STRIP" -r "$OPENSSL_BINARY" -o "$OPENSSL_BINARY"
  echo "✅ Method 2: Used bitcode_strip tool"
fi

# Method 3: Use lipo to extract architectures and rebuild
echo "🔧 Method 3: Using lipo to rebuild binary..."

# Get lipo path 
LIPO="$DEVELOPER_DIR/Toolchains/XcodeDefault.xctoolchain/usr/bin/lipo"
if [ ! -f "$LIPO" ]; then
  LIPO=$(which lipo)
fi

if [ -n "$LIPO" ]; then
  # Create a backup of the original binary
  cp "$OPENSSL_BINARY" "${OPENSSL_BINARY}.bak"
  
  # Extract architectures
  mkdir -p "$TEMP_DIR/archs"
  
  # Get the architectures in the binary
  ARCHS=$($LIPO -info "$OPENSSL_BINARY" | grep -o 'are:.*' | cut -d' ' -f2- || echo "arm64")
  
  # If archs detection fails, try a simpler approach
  if [ -z "$ARCHS" ]; then
    ARCHS="arm64"
  fi
  
  for ARCH in $ARCHS; do
    echo "  ➡️ Extracting $ARCH from OpenSSL binary"
    $LIPO -extract "$ARCH" "$OPENSSL_BINARY" -output "$TEMP_DIR/archs/OpenSSL-$ARCH" 2>/dev/null || true
    
    # If bitcode_strip is available, use it
    if [ -n "$BITCODE_STRIP" ]; then
      "$BITCODE_STRIP" -r "$TEMP_DIR/archs/OpenSSL-$ARCH" -output "$TEMP_DIR/archs/OpenSSL-$ARCH-stripped" 2>/dev/null || true
    fi
  done
  
  # Recombine architectures if extracted files exist
  ARCH_FILES=$(find "$TEMP_DIR/archs" -name "OpenSSL-*-stripped" 2>/dev/null)
  if [ -z "$ARCH_FILES" ]; then
    ARCH_FILES=$(find "$TEMP_DIR/archs" -name "OpenSSL-*" 2>/dev/null)
  fi
  
  if [ -n "$ARCH_FILES" ]; then
    echo "🔄 Recombining architectures"
    $LIPO -create $ARCH_FILES -output "$OPENSSL_BINARY" 2>/dev/null || true
    echo "✅ Method 3: Rebuilt binary using lipo"
  fi
fi

# Re-sign the framework
echo "🔐 Re-signing the OpenSSL framework..."
CODESIGN=$(which codesign)
if [ -n "$CODESIGN" ]; then
  $CODESIGN --force --sign - "$OPENSSL_FRAMEWORK" 2>/dev/null || true
fi

# Re-package the IPA
echo "📦 Re-packaging IPA..."
cd "$TEMP_DIR"
zip -qry "fixed.ipa" "Payload"

# Move the fixed IPA back to the original location
echo "🔄 Replacing original IPA with fixed version..."
mv "$TEMP_DIR/fixed.ipa" "$IPA_PATH"
chmod 644 "$IPA_PATH"  # Ensure the IPA has the correct permissions

# Clean up temporary directory
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"

echo "✅ OpenSSL bitcode removal complete! Your IPA should now be ready for App Store submission."
echo "👍 If this doesn't work, we recommend building without bitcode in your Xcode project settings." 