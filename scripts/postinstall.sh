#!/bin/bash
echo "PostInstall script:"

echo "1 - Fixing WKWebView..."
WKWEBVIEW_FILE=$(find . -name RCTWKWebView.m);
sed -i '' -e 's/injectionTime:WKUserScriptInjectionTimeAtDocumentEnd/injectionTime:WKUserScriptInjectionTimeAtDocumentStart/g' $WKWEBVIEW_FILE;

echo "Done"