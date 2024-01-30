#!/bin/bash
set -e

# Enable usage of nvm if it exists
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
. "$HOME/.nvm/nvm.sh"
elif [[ -x "$(command -v brew)" && -s "$(brew --prefix nvm)/nvm.sh" ]]; then
. "$(brew --prefix nvm)/nvm.sh"
fi

# Set node binary to use
export NODE_BINARY=$(which node)

# Source environment if file exists
WITH_ENVIRONMENT="../node_modules/react-native/scripts/xcode/with-environment.sh"
if [ -f "$WITH_ENVIRONMENT" ]; then
  . "$WITH_ENVIRONMENT"
fi

# Set Sentry properties
export SENTRY_PROPERTIES=${SENTRY_PROPERTIES:-"../sentry.properties"}

# Sentry environment variable used by Sentry CLI to upload files. Upload is disabled by default
export SENTRY_DISABLE_AUTO_UPLOAD=${SENTRY_DISABLE_AUTO_UPLOAD:-"true"}
# TODO - Move to JS side to be shared between platforms
export SENTRY_DIST=$CURRENT_PROJECT_VERSION
export SENTRY_RELEASE="$PRODUCT_BUNDLE_IDENTIFIER@$MARKETING_VERSION+$SENTRY_DIST"


# Generate JS bundle and upload Sentry source maps
REACT_NATIVE_XCODE="../node_modules/react-native/scripts/react-native-xcode.sh"
SENTRY_XCODE="../node_modules/@sentry/react-native/scripts/sentry-xcode.sh"
BUNDLE_REACT_NATIVE="/bin/sh $SENTRY_XCODE $REACT_NATIVE_XCODE"
/bin/sh -c "$WITH_ENVIRONMENT \"$BUNDLE_REACT_NATIVE\""

# Upload Sentry debug symbols
if [ "$SENTRY_DISABLE_AUTO_UPLOAD" == "false" ]; then
    [ "$SENTRY_INCLUDE_NATIVE_SOURCES" == "true" ] && INCLUDE_SOURCES_FLAG="--include-sources" || INCLUDE_SOURCES_FLAG=""
    ../node_modules/@sentry/cli/bin/sentry-cli debug-files upload "$INCLUDE_SOURCES_FLAG" "$DWARF_DSYM_FOLDER_PATH"
fi
