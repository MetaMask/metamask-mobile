#!/bin/bash
echo "PostInstall script:"

echo "1 - Fixing WKWebView..."
WKWEBVIEW_FILE=$(find . -name RCTWKWebView.m);
sed -i '' -e '143s/WKUserScriptInjectionTimeAtDocumentEnd/WKUserScriptInjectionTimeAtDocumentStart/' $WKWEBVIEW_FILE;
echo "Done"

echo "2 - React Native nodeify..."
node_modules/.bin/rn-nodeify --install 'crypto,buffer,react-native-randombytes,vm,stream' --hack

sed -i '' -e '143s/WKUserScriptInjectionTimeAtDocumentEnd/WKUserScriptInjectionTimeAtDocumentStart/' $WKWEBVIEW_FILE;

echo "3 - Fixing ethereumjs-wallet dependency (aes-js)..."
TARGET="node_modules/ethereumjs-wallet/node_modules/aes-js/index.js"
sed -i '' -e 's/var previous_mymodule/\/\/var previous_mymodule/' $TARGET;
echo "Done"

# Submitted a PR for this one. We should remove this
# once it gets merged

echo "4 - Fix react-native-randombytes buildTools version..."
TARGET="node_modules/react-native-randombytes/android/build.gradle"
sed -i '' -e 's/compileSdkVersion 23/compileSdkVersion 26/' $TARGET;
sed -i '' -e 's/23.0.1/26.0.1/' $TARGET;
echo "Done"
