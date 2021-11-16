#!/bin/bash
echo "PostInstall script:"

echo "1. React Native nodeify..."
node_modules/.bin/rn-nodeify --install 'crypto,buffer,react-native-randombytes,vm,stream,http,https,os,url,net,fs' --hack

echo "2. jetify"
npx jetify

echo "3. Patch npm packages"
npx patch-package

echo "4. Create xcconfig files..."
echo "" > ios/debug.xcconfig
echo "" > ios/release.xcconfig

echo "5. Init git submodules"
echo "This may take a while..."
git submodule update --init

echo "6. Setup react-native-codegen"
# Since we've patched React Native, Android requires us to build from source (ReactAndroid).
# ReactAndroid needs to reference react-native-codegen's android directory, which we are manually fetching here
mkdir -p node_modules/react-native/packages && cd node_modules/react-native/packages
curl --proto '=https' --tlsv1.2 -LJO https://github.com/facebook/react-native/archive/refs/tags/v0.66.0.tar.gz
tar -zxvf react-native-0.66.0.tar.gz react-native-0.66.0/packages/react-native-codegen/
mv react-native-0.66.0/packages/react-native-codegen/ .
# cleanup
rm -rf react-native-0.66.0/ react-native-0.66.0.tar.gz
