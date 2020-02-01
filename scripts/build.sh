#!/bin/bash

set -o pipefail

PLATFORM=$1
MODE=$2
TARGET=$3
RUN_DEVICE=false
PRE_RELEASE=false
JS_ENV_FILE=".js.env"
ANDROID_ENV_FILE=".android.env"
IOS_ENV_FILE=".ios.env"

envFileMissing() {
	FILE="$1"
	echo "'$FILE' is missing, you'll need to add it to the root of the project."
	echo "For convenience you can rename '$FILE.example' and fill in the parameters."
	echo ""
	exit 1
}

displayHelp() {
    echo ''
    echo "Usage: $0 {platform} ${--device}" >&2
    echo ''
    echo "Platform is required. Can be android or ios"
    echo ''
	echo "Mode is required. Can be debug or release"
    echo ''
	echo "Target is optional and valid for iOS only"
    echo ''
	echo "examples: $0 ios debug"
	echo ''
	echo "          $0 ios debug --device"
	echo ''
	echo "          $0 android debug"
	echo ''
	echo "          $0 android release"
	echo ''
    exit 1
}

printTitle(){
    echo ''
    echo '-------------------------------------------'
    echo ''
    echo "  🚀 BUILDING $PLATFORM in $MODE mode $TARGET" | tr [a-z] [A-Z]
    echo ''
    echo '-------------------------------------------'
    echo ''
}


printError(){
    ERROR_ICON=$'\342\235\214'
    echo ''
    echo "  $ERROR_ICON   $1"
    echo ''
}

checkParameters(){
    if [ "$#" -eq  "0" ]
    then
        printError 'Platform is a required parameter'
        displayHelp
        exit 0;
    elif [ "$1"  == "--help" ]
    then
        displayHelp
        exit 0;
    elif [ "$1" == "-h" ]
    then
        displayHelp
        exit 0;
    elif [ -z "$1" ]
    then
        displayHelp
        exit 0;
    elif [ -z "$1" ]
    then
        printError 'No platform supplied'
        displayHelp
        exit 0;
    fi

    if [[ $# -gt 2 ]] ; then
        if [ "$3"  == "--device" ] ; then
            RUN_DEVICE=true

           if [ "$#" -gt  "3" ] ; then
                printError "Incorrect number of arguments"
                displayHelp
                exit 0;
            fi
		elif [ "$3"  == "--pre" ] ; then
			PRE_RELEASE=true
        else
            printError "Unknown argument: $4"
            displayHelp
            exit 0;
        fi
    fi
}


prebuild(){
	# Import provider
	cp node_modules/metamask-mobile-provider/dist/index.js app/core/InpageBridgeWeb3.js

	# Load JS specific env variables
	if [ "$PRE_RELEASE" = false ] ; then
		if [ -e $JS_ENV_FILE ]
		then
			source $JS_ENV_FILE
		fi
	fi
}

prebuild_ios(){
	prebuild
	# Generate xcconfig files for CircleCI
	if [ "$PRE_RELEASE" = true ] ; then
		echo "" > ios/debug.xcconfig
		echo "" > ios/release.xcconfig
	fi
	# Required to install mixpanel dep
	git submodule update --init --recursive
}

prebuild_android(){
	adb kill-server
	adb start-server
	prebuild
	# Copy JS files for injection
	yes | cp -rf app/core/InpageBridgeWeb3.js android/app/src/main/assets/.
	# Copy fonts with iconset
	yes | cp -rf ./app/fonts/Metamask.ttf ./android/app/src/main/assets/fonts/Metamask.ttf
	if [ "$PRE_RELEASE" = false ] ; then
		if [ -e $ANDROID_ENV_FILE ]
		then
			source $ANDROID_ENV_FILE
		fi
	fi
}

buildAndroidRun(){
	prebuild_android
	react-native run-android
	git checkout android/app/fabric.properties
}

buildIosSimulator(){
	prebuild_ios
	react-native run-ios --simulator "iPhone 11 Pro"
}

buildIosDevice(){
	prebuild_ios
	react-native run-ios --device
}

buildIosRelease(){
	prebuild_ios

	# Replace release.xcconfig with ENV vars
	if [ "$PRE_RELEASE" = true ] ; then
		echo "Setting up env vars...";
		echo "$IOS_ENV" | tr "|" "\n" > $IOS_ENV_FILE
		echo "Build started..."
		brew install watchman
		cd ios && bundle install && bundle exec fastlane prerelease
		# Generate sourcemaps
		yarn sourcemaps:ios
	else
		if [ ! -f "ios/release.xcconfig" ] ; then
			echo "$IOS_ENV" | tr "|" "\n" > ios/release.xcconfig
		fi
		./node_modules/.bin/react-native run-ios  --configuration Release --simulator "iPhone 11 Pro (13.2)"
	fi
}

buildAndroidRelease(){
	if [ "$PRE_RELEASE" = false ] ; then
		adb uninstall io.metamask || true
	fi
	prebuild_android

	if [ "$PRE_RELEASE" = true ] ; then
		TARGET="android/app/build.gradle"
		sed -i'' -e 's/getPassword("mm","mm-upload-key")/"ANDROID_KEY"/' $TARGET;
		sed -i'' -e "s/ANDROID_KEY/$ANDROID_KEY/" $TARGET;
		echo "$ANDROID_KEYSTORE" | base64 --decode > android/keystores/release.keystore
	fi

	# GENERATE APK
	cd android && ./gradlew assembleRelease --no-daemon --max-workers 2

	# GENERATE BUNDLE
	if [ "$GENERATE_BUNDLE" = true ] ; then
		./gradlew bundleRelease
	fi

	if [ "$PRE_RELEASE" = true ] ; then
		# Generate sourcemaps
		yarn sourcemaps:android
	fi

	if [ "$PRE_RELEASE" = false ] ; then
		adb install app/build/outputs/apk/release/app-release.apk
	fi
}

buildAndroid() {
	if [ "$MODE" == "release" ] ; then
		buildAndroidRelease
	else
		buildAndroidRun
	fi
}

buildIos() {
	if [ "$MODE" == "release" ] ; then
		buildIosRelease
		else
		if [ "$RUN_DEVICE" = true ] ; then
			buildIosDevice
		else
			buildIosSimulator
		fi
	fi
}

checkParameters "$@"

printTitle

if [ "$PLATFORM" == "ios" ]; then
	# we don't care about env file in CI
	if [ -f "$IOS_ENV_FILE" ] || [ "$CI" = true ]; then
		buildIos
	else
		envFileMissing $IOS_ENV_FILE
	fi



else
	# we don't care about env file in CI
	if [ -f "$ANDROID_ENV_FILE" ] || [ "$CI" = true ]; then
		buildAndroid
	else
		envFileMissing $ANDROID_ENV_FILE
	fi
fi
