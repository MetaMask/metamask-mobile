#!/bin/bash

PLATFORM=$1
MODE=$2
TARGET=$3
RUN_DEVICE=false

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
        else
            printError "Unknown argument: $4"
            displayHelp
            exit 0;
        fi
    fi
}


prebuild(){
	# Concat InpageBridge + Web3 + setProvider
	./node_modules/.bin/concat-cli -f app/core/InpageBridge.js node_modules/web3/dist/web3.min.js app/util/setProvider.js -o app/core/InpageBridgeWeb3.js
	# Load JS specific env variables
	source .js.env
}

prebuild_ios(){
	prebuild
}

prebuild_android(){
	adb kill-server
	adb start-server
	prebuild
	# Copy JS files for injection
	yes | cp -rf app/core/InpageBridgeWeb3.js android/app/src/main/assets/.
	# Copy fonts with iconset
	yes | cp -rf ./app/fonts/Metamask.ttf ./android/app/src/main/assets/fonts/Metamask.ttf
	source .android.env

}

buildAndroid(){
	prebuild_android
	react-native run-android
}

buildIosSimulator(){
	prebuild_ios
	react-native run-ios
}

buildIosDevice(){
	prebuild_ios
	react-native run-ios  --device
}

buildIosRelease(){
	prebuild_ios
	cd ios && fastlane beta
}

buildAndroidRelease(){
	adb uninstall io.metamask || true
	prebuild_android
	cd android &&
	./gradlew assembleRelease &&
	adb install app/build/outputs/apk/release/app-release.apk
}


checkParameters "$@"

printTitle

if [ "$PLATFORM" == "ios" ]
  	then

	if [ "$MODE" == "release" ] ; then
		buildIosRelease
    else
		if [ "$RUN_DEVICE" = true ] ; then
			buildIosDevice
		else
			buildIosSimulator
		fi
	fi



else
	if [ "$MODE" == "release" ] ; then
		buildAndroidRelease
    else
		buildAndroid
	fi
fi
