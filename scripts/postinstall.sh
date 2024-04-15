#!/bin/bash
set -euo pipefail

echo "PostInstall script:"

echo "1. Build Inpage Bridge..."
./scripts/build-inpage-bridge.sh

echo "2. React Native nodeify..."
node_modules/.bin/rn-nodeify --install 'crypto,buffer,react-native-randombytes,vm,stream,http,https,os,url,net,fs' --hack

echo "3. jetify"
yarn jetify

echo "4. Patch npm packages"
yarn patch-package

echo "5. Create xcconfig files..."
echo "" > ios/debug.xcconfig
echo "" > ios/release.xcconfig

echo "6. Init git submodules"
echo "This may take a while..."
git submodule update --init

if ! [ -n "${CI+isset}" ] ; then
  echo "7. CI not detected, copying env variables..."
  if [ ! -f .js.env ]; then
      echo "Creating .js.env..."
      cp .js.env.example .js.env
  fi
  if [ ! -f .android.env ]; then
      echo "Creating .android.env..."
      cp .android.env.example .android.env
  fi
  if [ ! -f .ios.env ]; then
      echo "Creating .ios.env"
      cp .ios.env.example .ios.env
  fi
fi
