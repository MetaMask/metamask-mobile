#!/bin/bash
echo "PostInstall script:"

echo "1. Build Inpage Bridge..."
rm app/core/InpageBridgeWeb3.js
mkdir -p js/dist && rm -rf js/dist/*
cd js/inpage
../../node_modules/.bin/webpack --config webpack.config.js
cd ..
node content-script/build.js
cat dist/inpage-bundle.js content-script/index.js > dist/index-raw.js
../node_modules/.bin/webpack --config webpack.config.js
cd ..
cp js/dist/index.js app/core/InpageBridgeWeb3.js

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
