#!/bin/bash
echo "PostInstall script:"

echo "1. React Native nodeify..."
node_modules/.bin/rn-nodeify --install 'crypto,buffer,react-native-randombytes,vm,stream' --hack

# We need to submit a PR for this one.
echo "2. Fix react-native-os buildTools version..."
TARGET="node_modules/react-native-os/android/build.gradle"
sed -i '' -e 's/compileSdkVersion 23/compileSdkVersion 26/' $TARGET;
sed -i '' -e 's/23.0.1/27.0.3/' $TARGET;
echo "Done"

# This one has been fixed on master
# we can remove once they release a new version
echo "3. Fix react-native-fs buildTools version..."
TARGET="node_modules/react-native-fs/android/build.gradle"
sed -i '' -e 's/compileSdkVersion 25/compileSdkVersion 26/' $TARGET;
sed -i '' -e 's/25.0.0/27.0.3/' $TARGET;
echo "Done"

# The build output from aes-js breaks the metro bundler. Until we safely upgrade
# to a new version of aes-js, we patch it by removing the erroneous line.
echo "4. Fix aes-js build ouput..."
AES_OUTPUT_FILE="node_modules/aes-js/index.js";
sed -i '' -e 's/var previous_mymodule = root.mymodule;//g' $AES_OUTPUT_FILE;

# Reported here https://github.com/skv-headless/react-native-scrollable-tab-view/issues/910
echo "5. Fix react-native-scrollable-tab-view"
TARGET="node_modules/react-native-scrollable-tab-view/SceneComponent.js"
sed -i '' -e 's/...props,/...props/' $TARGET;
echo "Done"

# Waiting for PR to get merged: https://github.com/seekshiva/react-native-remote-svg/pull/18
echo "6. Fix react-native-remove-svg"
TARGET="node_modules/react-native-remote-svg/SvgImage.js"
sed -i '' 's/<WebView/<WebView originWhitelist={["*"]}/' $TARGET;
echo "Done"

# This one has been fixed on master
# we can remove once they release a new version
echo "7. Fix react-native-fabric buildTools version..."
TARGET="node_modules/react-native-fabric/android/build.gradle"
sed -i '' -e 's/compileSdkVersion 23/compileSdkVersion 26/' $TARGET;
sed -i '' -e 's/23.0.1/27.0.3/' $TARGET;
echo "Done"

echo "8. Update all the modules to BuildTools 27.0.3..."
TARGET="node_modules/react-native-aes-crypto/android/build.gradle"
sed -i '' -e 's/26.0.1/27.0.3/' $TARGET;
TARGET="node_modules/react-native-fabric/android/build.gradle"
sed -i '' -e 's/26.0.1/27.0.3/' $TARGET;
TARGET="node_modules/react-native-fs/android/build.gradle"
sed -i '' -e 's/26.0.1/27.0.3/' $TARGET;
TARGET="node_modules/react-native-keychain/android/build.gradle"
sed -i '' -e 's/26.0.1/27.0.3/' $TARGET;
TARGET="node_modules/react-native-linear-gradient/android/build.gradle"
sed -i '' -e 's/26.0.1/27.0.3/' $TARGET;
TARGET="node_modules/react-native-os/android/build.gradle"
sed -i '' -e 's/26.0.1/27.0.3/' $TARGET;
TARGET="node_modules/react-native-randombytes/android/build.gradle"
sed -i '' -e 's/26.0.1/27.0.3/' $TARGET;
TARGET="node_modules/react-native-vector-icons/android/build.gradle"
sed -i '' -e 's/26.0.1/27.0.3/' $TARGET;
TARGET="node_modules/detox/android/detox/build.gradle"
sed -i '' -e 's/26.0.2/27.0.3/' $TARGET;
echo "Done"

echo "9. Fix all android build warnings..."
TARGET="node_modules/react-native-aes-crypto/android/build.gradle"
sed -i '' -e 's/compile /api /' $TARGET;
TARGET="node_modules/react-native-fs/android/build.gradle"
sed -i '' -e 's/compile /api /' $TARGET;
TARGET="node_modules/react-native-fabric/android/build.gradle"
sed -i '' -e 's/compile /api /' $TARGET;
sed -i '' -e 's/compile(/api(/' $TARGET;
TARGET="node_modules/react-native-linear-gradient/android/build.gradle"
sed -i '' -e 's/provided /compileOnly /' $TARGET;
TARGET="node_modules/react-native-i18n/android/build.gradle"
sed -i '' -e 's/compile /api /' $TARGET;
TARGET="node_modules/react-native-os/android/build.gradle"
sed -i '' -e 's/compile /api /' $TARGET;
TARGET="node_modules/react-native-randombytes/android/build.gradle"
sed -i '' -e 's/compile /api /' $TARGET;
TARGET="node_modules/react-native-keychain/android/build.gradle"
sed -i '' -e 's/compile /api /' $TARGET;
TARGET="node_modules/react-native-vector-icons/android/build.gradle"
sed -i '' -e 's/compile /api /' $TARGET;
