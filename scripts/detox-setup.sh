#!/bin/bash

# Install detox-cli
echo "Installing detox-cli..."
yarn global add detox-cli

yarn add -D detox

# Install applesimutils
echo "Installing applesimutils..."
brew tap wix/brew
brew install applesimutils

echo "Installation complete."