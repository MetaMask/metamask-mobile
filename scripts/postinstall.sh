#!/bin/bash
echo "PostInstall script:"

echo "1 - Fixing WKWebView..."
WKWEBVIEW_FILE=$(find . -name RCTWKWebView.m);
sed -i '' -e '143s/WKUserScriptInjectionTimeAtDocumentEnd/WKUserScriptInjectionTimeAtDocumentStart/' $WKWEBVIEW_FILE;
echo "Done"

echo "1 - React Native nodeify..."
node_modules/.bin/rn-nodeify --install 'crypto,buffer,react-native-randombytes,vm,stream' --hack

sed -i '' -e '143s/WKUserScriptInjectionTimeAtDocumentEnd/WKUserScriptInjectionTimeAtDocumentStart/' $WKWEBVIEW_FILE;

echo "1 - Fixing ethereumjs-wallet dependency (aes-js)..."
TARGET="node_modules/ethereumjs-wallet/node_modules/aes-js/index.js"
sed -i '' -e 's/var previous_mymodule/\/\/var previous_mymodule/' $TARGET;
echo "Done"
