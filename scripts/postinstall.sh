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

# This pkg has been updated but no release in the last 2 years
# Tried it with the current master but it breaks (and it looks really different)
# Keeping it for now until we have time to investigate deeper
echo "3. Fixing ethereumjs-wallet dependency (aes-js)..."
TARGET="node_modules/ethereumjs-wallet/node_modules/aes-js/index.js"
sed -i '' -e 's/var previous_mymodule/\/\/var previous_mymodule/' $TARGET;
echo "Done"

# Submitted a PR for this one: https://github.com/mvayngrib/react-native-randombytes/pull/29
# We should remove this once it gets merged
# or we can also switch to https://github.com/brunobar79/react-native-randombytes
echo "4. Fix react-native-randombytes buildTools version..."
TARGET="node_modules/react-native-randombytes/android/build.gradle"
sed -i '' -e 's/compileSdkVersion 23/compileSdkVersion 26/' $TARGET;
sed -i '' -e 's/23.0.1/26.0.1/' $TARGET;
echo "Done"

# This one has been fixed on master
# we can remove once they release a new version
echo "5. Fix react-native-fs buildTools version..."
TARGET="node_modules/react-native-fs/android/build.gradle"
sed -i '' -e 's/compileSdkVersion 25/compileSdkVersion 26/' $TARGET;
sed -i '' -e 's/25.0.0/26.0.1/' $TARGET;
echo "Done"
