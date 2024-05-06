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

# Generate JS bundle and upload Sentry source maps
REACT_NATIVE_XCODE="../node_modules/react-native/scripts/react-native-xcode.sh"
/bin/sh -c "$WITH_ENVIRONMENT \"$REACT_NATIVE_XCODE\""
