#!/bin/bash
echo "PostInstall script:"

echo "1. React Native nodeify..."
node_modules/.bin/rn-nodeify --install 'crypto,buffer,react-native-randombytes,vm,stream,http,https,os,url' --hack

# We need to submit a PR for this one.
echo "2. Fix react-native-os buildTools version..."
TARGET="node_modules/react-native-os/android/build.gradle"
sed -i'' -e 's/compileSdkVersion 23/compileSdkVersion 28/' $TARGET;
sed -i'' -e 's/23.0.1/28.0.3/' $TARGET;
echo "Done"

# This one has been fixed on master
# we can remove once they release a new version
echo "3. Fix react-native-fs buildTools version..."
TARGET="node_modules/react-native-fs/android/build.gradle"
sed -i'' -e 's/compileSdkVersion 25/compileSdkVersion 28/' $TARGET;
sed -i'' -e 's/25.0.0/28.0.3/' $TARGET;
echo "Done"

# The build output from aes-js breaks the metro bundler. Until we safely upgrade
# to a new version of aes-js, we patch it by removing the erroneous line.
echo "4. Fix aes-js build ouput..."
AES_OUTPUT_FILE="node_modules/aes-js/index.js";
sed -i'' -e 's/var previous_mymodule = root.mymodule;//g' $AES_OUTPUT_FILE;

# Reported here https://github.com/skv-headless/react-native-scrollable-tab-view/issues/910
echo "5. Fix react-native-scrollable-tab-view"
TARGET="node_modules/react-native-scrollable-tab-view/SceneComponent.js"
sed -i'' -e 's/...props,/...props/' $TARGET;
echo "Done"


# This one has been fixed on master
# we can remove once they release a new version
echo "6. Fix react-native-fabric buildTools version..."
TARGET="node_modules/react-native-fabric/android/build.gradle"
sed -i'' -e 's/compileSdkVersion 23/compileSdkVersion 28/' $TARGET;
sed -i'' -e 's/23.0.1/28.0.3/' $TARGET;
echo "Done"

echo "7. Update all the modules to BuildTools 28.0.3..."
TARGET="node_modules/react-native-aes-crypto/android/build.gradle"
sed -i'' -e 's/27.0.3/28.0.3/' $TARGET;
sed -i'' -e 's/23.0.1/28.0.0/' $TARGET;
sed -i'' -e 's/26/28/' $TARGET;
sed -i'' -e 's/22/28/' $TARGET;
TARGET="node_modules/react-native-fabric/android/build.gradle"
sed -i'' -e 's/26.0.1/28.0.3/' $TARGET;
TARGET="node_modules/react-native-fs/android/build.gradle"
sed -i'' -e 's/26.0.1/28.0.3/' $TARGET;
TARGET="node_modules/react-native-keychain/android/build.gradle"
sed -i'' -e 's/26.0.1/28.0.3/' $TARGET;
TARGET="node_modules/react-native-os/android/build.gradle"
sed -i'' -e 's/26.0.1/28.0.3/' $TARGET;
TARGET="node_modules/react-native-randombytes/android/build.gradle"
sed -i'' -e 's/26.0.1/28.0.3/' $TARGET;
TARGET="node_modules/react-native-vector-icons/android/build.gradle"
sed -i'' -e 's/26.0.1/28.0.3/' $TARGET;
TARGET="node_modules/detox/android/detox/build.gradle"
sed -i'' -e 's/27.0.3/28.0.3/' $TARGET;
sed -i'' -e 's/ 25/ 28/' $TARGET;
sed -i'' -e 's/ 18/ 19/' $TARGET;
TARGET="node_modules/react-native-branch/android/build.gradle"
sed -i'' -e 's/23.0.1/28.0.3/' $TARGET;

echo "Done"

echo "8. Fix all android build warnings..."
TARGET="node_modules/react-native-aes-crypto/android/build.gradle"
sed -i'' -e 's/compile /api /' $TARGET;
TARGET="node_modules/react-native-fs/android/build.gradle"
sed -i'' -e 's/compile /api /' $TARGET;
TARGET="node_modules/react-native-fabric/android/build.gradle"
sed -i'' -e 's/compile /api /' $TARGET;
sed -i'' -e 's/compile(/api(/' $TARGET;
TARGET="node_modules/react-native-i18n/android/build.gradle"
sed -i'' -e 's/compile /api /' $TARGET;
TARGET="node_modules/react-native-os/android/build.gradle"
sed -i'' -e 's/compile /api /' $TARGET;
TARGET="node_modules/react-native-randombytes/android/build.gradle"
sed -i'' -e 's/compile /api /' $TARGET;
TARGET="node_modules/react-native-keychain/android/build.gradle"
sed -i'' -e 's/compile /api /' $TARGET;
TARGET="node_modules/react-native-vector-icons/android/build.gradle"
sed -i'' -e 's/compile /api /' $TARGET;

TARGET="node_modules/react-native-branch/android/build.gradle"
sed -i'' -e 's/ 23/ 28/' $TARGET;
sed -i'' -e 's/ 22/ 28/' $TARGET;
sed -i'' -e 's/ 16/ 19/' $TARGET;
sed -i'' -e 's/compile /api /' $TARGET;

echo "9. Create xcconfig files..."
echo "" > ios/debug.xcconfig
echo "" > ios/release.xcconfig


echo "10. Fix react-native-push-notification ..."
rm -rf node_modules/react-native-push-notification/.git
