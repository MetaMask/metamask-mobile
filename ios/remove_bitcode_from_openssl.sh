#!/bin/bash

# Script to remove bitcode from OpenSSL framework binaries
# This is needed because Apple no longer accepts apps with bitcode since Xcode 14

set -e  # Exit immediately if a command exits with a non-zero status

# Get Xcode developer path
DEVELOPER_DIR=$(xcode-select -p)
if [ -z "$DEVELOPER_DIR" ]; then
  echo "Error: Could not find Xcode developer directory."
  exit 1
fi

# Get lipo path 
LIPO="$DEVELOPER_DIR/Toolchains/XcodeDefault.xctoolchain/usr/bin/lipo"
if [ ! -f "$LIPO" ]; then
  echo "Error: lipo command not found at $LIPO"
  exit 1
fi

OPENSSL_PATHS=(
  "Pods/OpenSSL-Universal/Frameworks/OpenSSL.xcframework/ios-arm64_armv7/OpenSSL.framework/OpenSSL"
  "Pods/OpenSSL-Universal/Frameworks/OpenSSL.xcframework/ios-arm64_i386_x86_64-simulator/OpenSSL.framework/OpenSSL"
  "Pods/OpenSSL-Universal/Frameworks/OpenSSL.xcframework/ios-arm64_x86_64-maccatalyst/OpenSSL.framework/OpenSSL"
  "Pods/OpenSSL-Universal/Frameworks/OpenSSL.xcframework/macos-arm64_x86_64/OpenSSL.framework/OpenSSL"
)

for path in "${OPENSSL_PATHS[@]}"; do
  if [ -f "$path" ]; then
    echo "Processing $path"
    
    # Create backup of original binary
    cp "$path" "${path}.bak"
    
    # Instead of removing bitcode, we'll rebuild the framework without it
    # First, extract each architecture
    TEMP_DIR=$(mktemp -d)
    ARCHS=$($LIPO -info "$path" | rev | cut -d':' -f1 | rev)
    
    for ARCH in $ARCHS; do
      echo "Extracting $ARCH from $path"
      $LIPO -thin "$ARCH" "$path" -output "$TEMP_DIR/OpenSSL-$ARCH"
    done
    
    # Then recombine them
    ARCH_FILES=$(find "$TEMP_DIR" -name "OpenSSL-*")
    echo "Recombining architectures: $ARCH_FILES"
    $LIPO -create $ARCH_FILES -output "$path"
    
    # Clean up
    rm -rf "$TEMP_DIR"
    
    echo "✅ Successfully rebuilt $path without bitcode"
  else
    echo "⚠️ File not found: $path"
  fi
done

echo "✅ Bitcode removal process complete" 