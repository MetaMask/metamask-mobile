#!/bin/bash
echo "PostInstall script:"

# Submitted a PR for this one: https://github.com/CRAlpha/react-native-wkwebview/pull/174
# We should remove this once it gets merged
echo "1. Fixing WKWebView..."
WKWEBVIEW_FILE=$(find . -name RCTWKWebView.m);
sed -i '' -e '143s/WKUserScriptInjectionTimeAtDocumentEnd/WKUserScriptInjectionTimeAtDocumentStart/' $WKWEBVIEW_FILE;
echo "Done"

echo "2. React Native nodeify..."
node_modules/.bin/rn-nodeify --install 'crypto,buffer,react-native-randombytes,vm,stream' --hack
sed -i '' -e '143s/WKUserScriptInjectionTimeAtDocumentEnd/WKUserScriptInjectionTimeAtDocumentStart/' $WKWEBVIEW_FILE;


# We need to submit a PR for this one.
echo "3. Fix react-native-os buildTools version..."
TARGET="node_modules/react-native-os/android/build.gradle"
sed -i '' -e 's/compileSdkVersion 23/compileSdkVersion 26/' $TARGET;
sed -i '' -e 's/23.0.1/26.0.1/' $TARGET;
echo "Done"


# This one has been fixed on master
# we can remove once they release a new version
echo "4. Fix react-native-fs buildTools version..."
TARGET="node_modules/react-native-fs/android/build.gradle"
sed -i '' -e 's/compileSdkVersion 25/compileSdkVersion 26/' $TARGET;
sed -i '' -e 's/25.0.0/26.0.1/' $TARGET;
echo "Done"

# The build output from aes-js breaks the metro bundler. Until we safely upgrade
# to a new version of aes-js, we patch it by removing the erroneous line.
echo "5. Fix aes-js build ouput..."
AES_OUTPUT_FILE="node_modules/aes-js/index.js";
sed -i '' -e 's/var previous_mymodule = root.mymodule;//g' $AES_OUTPUT_FILE;

# Reported here https://github.com/skv-headless/react-native-scrollable-tab-view/issues/910
echo "6. Fix react-native-scrollable-tab-view"
TARGET="node_modules/react-native-scrollable-tab-view/SceneComponent.js"
sed -i '' -e 's/...props,/...props/' $TARGET;
echo "Done"

# Waiting for PR to get merged: https://github.com/seekshiva/react-native-remote-svg/pull/18
echo "7. Fix react-native-remove-svg"
TARGET="node_modules/react-native-remote-svg/SvgImage.js"
sed -i '' 's/<WebView/<WebView originWhitelist={["*"]}/' $TARGET;
echo "Done"


# This one has been fixed on master
# we can remove once they release a new version
echo "8. Fix react-native-fabric buildTools version..."
TARGET="node_modules/react-native-fabric/android/build.gradle"
sed -i '' -e 's/compileSdkVersion 23/compileSdkVersion 26/' $TARGET;
sed -i '' -e 's/23.0.1/26.0.1/' $TARGET;
echo "Done"
