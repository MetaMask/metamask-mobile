#!/bin/bash
echo "PostInstall script:"

echo "0. Fix connext client"
# Replace console.error by console.log to avoid red screens
find node_modules/connext/dist -type f -name "*.js" | xargs sed -i'' -e 's/console.error/console.log/g'

echo "1. React Native nodeify..."
node_modules/.bin/rn-nodeify --install 'crypto,buffer,react-native-randombytes,vm,stream,http,https,os,url,net,fs' --hack

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

echo "11. Fix xmlhttprequest"
TARGET="node_modules/xmlhttprequest/lib/XMLHttpRequest.js"
sed -i'' -e 's/var spawn /\/\/var spawn/' $TARGET;

echo "12. Fix react-native-i18n"
TARGET="node_modules/react-native-i18n/android/src/main/AndroidManifest.xml"
sed -i'' -e 's/<uses-sdk android:minSdkVersion="16" \/>//' $TARGET;

# We can get rid of this once we upgrade to 0.60
# which contains a fix
echo "13. Fix react-native v0.59.8"
TARGET="node_modules/react-native/react.gradle"

if grep -q "doLast" $TARGET;
then
	echo "Already patched";
else
	sed -i'' -e '50i\
	doLast {\
		def moveFunc = { resSuffix ->\
			File originalDir = file("$buildDir/generated/res/react/release/drawable-${resSuffix}");\
			if (originalDir.exists()) {\
				File destDir = file("$buildDir/../src/main/res/drawable-${resSuffix}");\
				ant.move(file: originalDir, tofile: destDir);\
			}\
		}\
		moveFunc.curry("ldpi").call()\
		moveFunc.curry("mdpi").call()\
		moveFunc.curry("hdpi").call()\
		moveFunc.curry("xhdpi").call()\
		moveFunc.curry("xxhdpi").call()\
		moveFunc.curry("xxxhdpi").call()\
	}' $TARGET;
fi

echo "14. Remove UIWebview deps"
rm -rf node_modules/react-native/React/Views/RCTWebView.m
rm -rf node_modules/react-native/React/Views/RCTWebViewManager.h
rm -rf node_modules/react-native/React/Views/RCTWebViewManager.m
sed -i.bak '/RCTWebView/d' node_modules/react-native/React/React.xcodeproj/project.pbxproj
rm -rf node_modules/react-native/React/React.xcodeproj/project.pbxproj.bak

echo "15. Remove Branch examples"
rm -rf node_modules/react-native-branch/examples/
rm -rf node_modules/react-native-branch/native-tests/

echo "16. Connext v2 fixes"
TARGET="node_modules/websocket-nats/lib/nats.js"
# set default nats port
sed -i'' -e 's/this.url = url;/this.url = url;this.url.port = 4222;/' $TARGET;
# remove core-js/stable
TARGET="node_modules/@connext/client/dist/connext.js"
sed -i'' -e 's/require("core-js\/stable");//' $TARGET;
# remove TCPSocket logs
TARGET="node_modules/react-native-tcp/TcpSocket.js"
sed -i'' -e 's/console.log.apply(console, args);//' $TARGET;
