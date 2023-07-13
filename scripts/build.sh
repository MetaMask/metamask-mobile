#!/bin/bash

set -o pipefail

readonly __DIRNAME__="$( cd "${BASH_SOURCE[0]%/*}" && pwd )"
readonly REPO_ROOT_DIR="$(dirname "${__DIRNAME__}")"

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
	cp node_modules/@metamask/mobile-provider/dist/index.js app/core/InpageBridgeWeb3.js
	yarn --ignore-engines build:static-logos

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
	unset PREFIX
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
	react-native run-android --variant=prodDebug --active-arch-only
}

buildAndroidRunQA(){
	prebuild_android
	react-native run-android --variant=qaDebug --active-arch-only
}

buildIosSimulator(){
	prebuild_ios
	SIM="${IOS_SIMULATOR:-"iPhone 12 Pro"}"
	react-native run-ios --simulator "$SIM"
}

buildIosSimulatorQA(){
	prebuild_ios
	SIM="${IOS_SIMULATOR:-"iPhone 12 Pro"}"
	cd ios && xcodebuild -workspace MetaMask.xcworkspace -scheme MetaMask-QA -configuration Debug  -sdk iphonesimulator -derivedDataPath build
}

buildIosSimulatorE2E(){
	prebuild_ios
	cd ios && xcodebuild -workspace MetaMask.xcworkspace -scheme MetaMask -configuration Debug  -sdk iphonesimulator -derivedDataPath build
}

runIosE2E(){
  cd e2e && yarn ios:debug
}

buildIosDevice(){
	prebuild_ios
	react-native run-ios --device
}

buildIosDeviceQA(){
	prebuild_ios
	react-native run-ios --device --scheme "MetaMask-QA"
}

generateArchivePackages() {
  scheme="$1"

  if [ "$scheme" = "MetaMask-QA" ] ; then
    exportOptionsPlist="MetaMask/IosExportOptionsMetaMaskQARelease.plist"
  else
    exportOptionsPlist="MetaMask/IosExportOptionsMetaMaskRelease.plist"
  fi

  echo "exportOptionsPlist: $exportOptionsPlist"
  echo "Generating archive packages for $scheme"
	xcodebuild -workspace MetaMask.xcworkspace -scheme $scheme -configuration Release COMIPLER_INDEX_STORE_ENABLE=NO archive -archivePath build/$scheme.xcarchive -destination generic/platform=ios
  echo "Generating ipa for $scheme"
  xcodebuild -exportArchive -archivePath build/$scheme.xcarchive -exportPath build/output -exportOptionsPlist $exportOptionsPlist
}

buildIosRelease(){
	prebuild_ios

	# Replace release.xcconfig with ENV vars
	if [ "$PRE_RELEASE" = true ] ; then
		echo "Setting up env vars...";
		echo "$IOS_ENV" | tr "|" "\n" > $IOS_ENV_FILE
		echo "Build started..."
		brew install watchman
		cd ios
		generateArchivePackages "MetaMask"
		# Generate sourcemaps
		yarn sourcemaps:ios
	else
		if [ ! -f "ios/release.xcconfig" ] ; then
			echo "$IOS_ENV" | tr "|" "\n" > ios/release.xcconfig
		fi
		./node_modules/.bin/react-native run-ios  --configuration Release --simulator "iPhone 12 Pro"
	fi
}

buildIosReleaseE2E(){
	prebuild_ios

	# Replace release.xcconfig with ENV vars
	if [ "$PRE_RELEASE" = true ] ; then
		echo "Setting up env vars...";
		echo "$IOS_ENV" | tr "|" "\n" > $IOS_ENV_FILE
		echo "Pre-release E2E Build started..."
		brew install watchman
		cd ios
		generateArchivePackages "MetaMask"
		# Generate sourcemaps
		yarn sourcemaps:ios
	else
		echo "Release E2E Build started..."
		if [ ! -f "ios/release.xcconfig" ] ; then
			echo "$IOS_ENV" | tr "|" "\n" > ios/release.xcconfig
		fi
		cd ios && xcodebuild -workspace MetaMask.xcworkspace -scheme MetaMask -configuration Release -sdk iphonesimulator -derivedDataPath build
	fi
}

buildIosQA(){
	prebuild_ios

  echo "Start QA build..."
  echo "BITRISE_GIT_BRANCH: $BITRISE_GIT_BRANCH"

	# Replace release.xcconfig with ENV vars
	if [ "$PRE_RELEASE" = true ] ; then
		echo "Setting up env vars...";
    echo "$IOS_ENV"
		echo "$IOS_ENV" | tr "|" "\n" > $IOS_ENV_FILE
		echo "Build started..."
		brew install watchman
		cd ios
		generateArchivePackages "MetaMask-QA"
		# Generate sourcemaps
		yarn sourcemaps:ios
	else
		if [ ! -f "ios/release.xcconfig" ] ; then
			echo "$IOS_ENV" | tr "|" "\n" > ios/release.xcconfig
		fi
		./node_modules/.bin/react-native run-ios --scheme MetaMask-QA  --configuration Release --simulator "iPhone 12 Pro"
	fi
}


buildAndroidQA(){
	if [ "$PRE_RELEASE" = false ] ; then
		adb uninstall io.metamask.qa
	fi

	prebuild_android
	# Generate APK
	cd android && ./gradlew assembleQaRelease --no-daemon --max-workers 2

	# GENERATE BUNDLE
	if [ "$GENERATE_BUNDLE" = true ] ; then
		./gradlew bundleQaRelease
	fi

	if [ "$PRE_RELEASE" = true ] ; then
		# Generate sourcemaps
		yarn sourcemaps:android
		# Generate checksum
		yarn build:android:checksum:qa
	fi

	 if [ "$PRE_RELEASE" = false ] ; then
	 	adb install app/build/outputs/apk/qa/release/app-qa-release.apk
	 fi
}

buildAndroidRelease(){
	if [ "$PRE_RELEASE" = false ] ; then
		adb uninstall io.metamask || true
	fi
	prebuild_android

	# GENERATE APK
	cd android && ./gradlew assembleProdRelease --no-daemon --max-workers 2

	# GENERATE BUNDLE
	if [ "$GENERATE_BUNDLE" = true ] ; then
		./gradlew bundleProdRelease
	fi

	if [ "$PRE_RELEASE" = true ] ; then
		# Generate sourcemaps
		yarn sourcemaps:android
		# Generate checksum
		yarn build:android:checksum
	fi

	if [ "$PRE_RELEASE" = false ] ; then
		adb install app/build/outputs/apk/prod/release/app-prod-release.apk
	fi
}

buildAndroidReleaseE2E(){
	prebuild_android
	cd android && ./gradlew assembleProdRelease app:assembleProdReleaseAndroidTest -PminSdkVersion=26 -DtestBuildType=release
}

buildAndroidQAE2E(){
	prebuild_android
	cd android && ./gradlew assembleQaRelease app:assembleQaReleaseAndroidTest -PminSdkVersion=26 -DtestBuildType=release
}

buildAndroid() {
	if [ "$MODE" == "release" ] ; then
		buildAndroidRelease
	elif [ "$MODE" == "QA" ] ; then
		buildAndroidQA
	elif [ "$MODE" == "releaseE2E" ] ; then
		buildAndroidReleaseE2E
	elif [ "$MODE" == "QAE2E" ] ; then
		buildAndroidQAE2E
  elif [ "$MODE" == "debugE2E" ] ; then
		buildAndroidRunE2E
	elif [ "$MODE" == "qaDebug" ] ; then
		buildAndroidRunQA
	else
		buildAndroidRun
	fi
}

buildAndroidRunE2E(){
	prebuild_android
	if [ -e $ANDROID_ENV_FILE ]
	then
		source $ANDROID_ENV_FILE
	fi
	cd android && ./gradlew assembleProdDebug app:assembleAndroidTest -DtestBuildType=debug && cd ..
}

buildIos() {
	echo "Build iOS $MODE started..."
	if [ "$MODE" == "release" ] ; then
		buildIosRelease
	elif [ "$MODE" == "releaseE2E" ] ; then
		buildIosReleaseE2E
  elif [ "$MODE" == "debugE2E" ] ; then
		buildIosSimulatorE2E
	elif [ "$MODE" == "QA" ] ; then
		buildIosQA
	elif [ "$MODE" == "qaDebug" ] ; then
		if [ "$RUN_DEVICE" = true ] ; then
			buildIosDeviceQA
		else
			buildIosSimulatorQA
		fi
	else
		if [ "$RUN_DEVICE" = true ] ; then
			buildIosDevice
		else
			buildIosSimulator
		fi
	fi
}

startWatcher() {
	source $JS_ENV_FILE
	yarn --ignore-engines build:static-logos
	if [ "$MODE" == "clean" ]; then
		watchman watch-del-all
		rm -rf $TMPDIR/metro-cache
		react-native start -- --reset-cache
	else
		react-native start
	fi
}

checkAuthToken() {
	local propertiesFileName="$1"

	if [ -n "${MM_SENTRY_AUTH_TOKEN}" ]; then
		sed -i'' -e "s/auth.token.*/auth.token=${MM_SENTRY_AUTH_TOKEN}/" "./${propertiesFileName}";
	elif ! grep -qE '^auth.token=[[:alnum:]]+$' "./${propertiesFileName}"; then
		printError "Missing auth token in '${propertiesFileName}'; add the token, or set it as MM_SENTRY_AUTH_TOKEN"
		exit 1
	fi

	if [ ! -e "./${propertiesFileName}" ]; then
		if [ -n "${MM_SENTRY_AUTH_TOKEN}" ]; then
			cp "./${propertiesFileName}.example" "./${propertiesFileName}"
			sed -i'' -e "s/auth.token.*/auth.token=${MM_SENTRY_AUTH_TOKEN}/" "./${propertiesFileName}";
		else
			printError "Missing '${propertiesFileName}' file (see '${propertiesFileName}.example' or set MM_SENTRY_AUTH_TOKEN to generate)"
			exit 1
		fi
	fi
}

checkParameters "$@"

printTitle
if [ "$MODE" == "release" ] || [ "$MODE" == "releaseE2E" ] || [ "$MODE" == "QA" ] || [ "$MODE" == "QAE2E" ]; then

 	if [ "$PRE_RELEASE" = false ]; then
		echo "RELEASE SENTRY PROPS"
 		checkAuthToken 'sentry.release.properties'
 		export SENTRY_PROPERTIES="${REPO_ROOT_DIR}/sentry.release.properties"
 	else
	 	echo "DEBUG SENTRY PROPS"
 		checkAuthToken 'sentry.debug.properties'
 		export SENTRY_PROPERTIES="${REPO_ROOT_DIR}/sentry.debug.properties"
 	fi


	if [ -z "$METAMASK_ENVIRONMENT" ]; then
		printError "Missing METAMASK_ENVIRONMENT; set to 'production' for a production release, 'prerelease' for a pre-release, or 'local' otherwise"
		exit 1
	fi
fi

if [ "$PLATFORM" == "ios" ]; then
	# we don't care about env file in CI
	if [ -f "$IOS_ENV_FILE" ] || [ "$CI" = true ]; then
		buildIos
	else
		envFileMissing $IOS_ENV_FILE
	fi
elif [ "$PLATFORM" == "watcher" ]; then
	startWatcher
else
	# we don't care about env file in CI
	if [ -f "$ANDROID_ENV_FILE" ] || [ "$CI" = true ]; then
		buildAndroid
	else
		envFileMissing $ANDROID_ENV_FILE
	fi
fi
