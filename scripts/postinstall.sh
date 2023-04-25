#!/bin/bash
echo "PostInstall script:"

echo "1. React Native nodeify..."
node_modules/.bin/rn-nodeify --install 'crypto,buffer,react-native-randombytes,vm,stream,http,https,os,url,net,fs' --hack

echo "2. jetify"
yarn jetify

echo "3. Patch npm packages"
yarn patch-package

echo "4. Create xcconfig files..."
echo "" > ios/debug.xcconfig
echo "" > ios/release.xcconfig

echo "5. Init git submodules"
echo "This may take a while..."
git submodule update --init

echo "6. Setup react-native-codegen"
# Since we've patched React Native, Android requires us to build from source (ReactAndroid).
# ReactAndroid needs to reference react-native-codegen's android directory, which we are manually fetching here

REACT_NATIVE_VERSION="0.66.0"

rm -rf node_modules/react-native/packages
mkdir -p node_modules/react-native/packages && cd node_modules/react-native/packages
curl --proto '=https' --tlsv1.2 -LJO https://github.com/facebook/react-native/archive/refs/tags/v${REACT_NATIVE_VERSION}.tar.gz
tar -zxvf react-native-${REACT_NATIVE_VERSION}.tar.gz react-native-${REACT_NATIVE_VERSION}/packages/react-native-codegen/
mv react-native-0.66.0/packages/react-native-codegen/ .
# cleanup
rm react-native-${REACT_NATIVE_VERSION}.tar.gz
