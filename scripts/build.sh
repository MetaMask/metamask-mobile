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

remapEnvVariable() {
    # Get the old and new variable names
    old_var_name=$1
    new_var_name=$2

    # Check if the old variable exists
    if [ -z "${!old_var_name}" ]; then
        echo "Error: $old_var_name does not exist in the environment."
        return 1
    fi

    # Remap the variable
    export $new_var_name="${!old_var_name}"

    unset $old_var_name

    echo "Successfully remapped $old_var_name to $new_var_name."
}

remapEnvVariableQA() {
  	echo "Remapping QA env variable names to match QA values"
  	remapEnvVariable "SEGMENT_WRITE_KEY_QA" "SEGMENT_WRITE_KEY"
  	remapEnvVariable "SEGMENT_PROXY_URL_QA" "SEGMENT_PROXY_URL"
  	remapEnvVariable "SEGMENT_DELETE_API_SOURCE_ID_QA" "SEGMENT_DELETE_API_SOURCE_ID"
  	remapEnvVariable "SEGMENT_REGULATIONS_ENDPOINT_QA" "SEGMENT_REGULATIONS_ENDPOINT"
}

remapEnvVariableRelease() {
  	echo "Remapping release env variable names to match production values"
  	remapEnvVariable "SEGMENT_WRITE_KEY_PROD" "SEGMENT_WRITE_KEY"
  	remapEnvVariable "SEGMENT_PROXY_URL_PROD" "SEGMENT_PROXY_URL"
  	remapEnvVariable "SEGMENT_DELETE_API_SOURCE_ID_PROD" "SEGMENT_DELETE_API_SOURCE_ID"
  	remapEnvVariable "SEGMENT_REGULATIONS_ENDPOINT_PROD" "SEGMENT_REGULATIONS_ENDPOINT"
}

remapFlaskEnvVariables() {
  	echo "Remapping Flask env variable names to match Flask values"
  	remapEnvVariable "SEGMENT_WRITE_KEY_FLASK" "SEGMENT_WRITE_KEY"
  	remapEnvVariable "SEGMENT_PROXY_URL_FLASK" "SEGMENT_PROXY_URL"
  	remapEnvVariable "SEGMENT_DELETE_API_SOURCE_ID_FLASK" "SEGMENT_DELETE_API_SOURCE_ID"
  	remapEnvVariable "SEGMENT_REGULATIONS_ENDPOINT_FLASK" "SEGMENT_REGULATIONS_ENDPOINT"
}

loadJSEnv(){
	# Load JS specific env variables
	if [ "$PRE_RELEASE" = false ] ; then
		if [ -e $JS_ENV_FILE ]
		then
			source $JS_ENV_FILE
		fi
	fi
	# Disable auto Sentry file upload by default
	export SENTRY_DISABLE_AUTO_UPLOAD=${SENTRY_DISABLE_AUTO_UPLOAD:-"true"}
}


prebuild(){
	# Import provider
	yarn --ignore-engines build:static-logos

  WATCHER_PORT=${WATCHER_PORT:-8081}
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
	yes | cp -rf app/core/InpageContentWeb3.js android/app/src/main/assets/.
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
	react-native run-android --port=$WATCHER_PORT --variant=prodDebug --active-arch-only
}

buildAndroidRunQA(){
	prebuild_android
	react-native run-android --port=$WATCHER_PORT --variant=qaDebug --active-arch-only
}

buildAndroidRunFlask(){
	prebuild_android
	react-native run-android --port=$WATCHER_PORT --variant=flaskDebug --active-arch-only
}

buildIosSimulator(){
	prebuild_ios
	if [ -n "$IOS_SIMULATOR" ]; then
		SIM_OPTION="--simulator \"$IOS_SIMULATOR\""
	else
		SIM_OPTION=""
	fi
	react-native run-ios --port=$WATCHER_PORT $SIM_OPTION
}

buildIosSimulatorQA(){
	prebuild_ios
	SIM="${IOS_SIMULATOR:-"iPhone 13 Pro"}"
	react-native run-ios --port=$WATCHER_PORT --simulator "$SIM" --scheme "MetaMask-QA"
}

buildIosSimulatorFlask(){
	prebuild_ios
	SIM="${IOS_SIMULATOR:-"iPhone 13 Pro"}"
	react-native run-ios --port=$WATCHER_PORT --simulator "$SIM" --scheme "MetaMask-Flask"
}

buildIosSimulatorE2E(){
	prebuild_ios
	cd ios && CC=clang CXX=clang CLANG=clang CLANGPLUSPLUS=clang++ LD=clang LDPLUSPLUS=clang++ xcodebuild -workspace MetaMask.xcworkspace -scheme MetaMask -configuration Debug -sdk iphonesimulator -derivedDataPath build
}

buildIosQASimulatorE2E(){
	prebuild_ios
	cd ios && xcodebuild -workspace MetaMask.xcworkspace -scheme MetaMask-QA -configuration Debug -sdk iphonesimulator -derivedDataPath build
}

runIosE2E(){
  cd e2e && yarn ios:debug
}

buildIosDevice(){
	prebuild_ios
	react-native run-ios --port=$WATCHER_PORT --device
}

buildIosDeviceQA(){
	prebuild_ios
	react-native run-ios --port=$WATCHER_PORT --device --scheme "MetaMask-QA"
}

buildIosDeviceFlask(){
	prebuild_ios
	react-native run-ios --device --scheme "MetaMask-Flask"
}

generateArchivePackages() {
  scheme="$1"

  if [ "$scheme" = "MetaMask-QA" ] ; then
    exportOptionsPlist="MetaMask/IosExportOptionsMetaMaskQARelease.plist"
  elif [ "$scheme" = "MetaMask-Flask" ] ; then
    exportOptionsPlist="MetaMask/IosExportOptionsMetaMaskFlaskRelease.plist"
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

  remapEnvVariableRelease

	# Enable Sentry to auto upload source maps and debug symbols
	export SENTRY_DISABLE_AUTO_UPLOAD="false"
	prebuild_ios

	# Replace release.xcconfig with ENV vars
	if [ "$PRE_RELEASE" = true ] ; then
		echo "Setting up env vars...";
		echo "$IOS_ENV" | tr "|" "\n" > $IOS_ENV_FILE
		echo "Build started..."
		brew install watchman
		cd ios
		generateArchivePackages "MetaMask"
	else
		if [ ! -f "ios/release.xcconfig" ] ; then
			echo "$IOS_ENV" | tr "|" "\n" > ios/release.xcconfig
		fi
		./node_modules/.bin/react-native run-ios --configuration Release --simulator "iPhone 13 Pro"
	fi
}

buildIosFlaskRelease(){
	# remap flask env variables to match what the app expects
	remapFlaskEnvVariables

	prebuild_ios

	# Replace release.xcconfig with ENV vars
	if [ "$PRE_RELEASE" = true ] ; then
		echo "Setting up env vars...";
		echo "$IOS_ENV" | tr "|" "\n" > $IOS_ENV_FILE
		echo "Build started..."
		brew install watchman
		cd ios
		generateArchivePackages "MetaMask-Flask"
	else
		if [ ! -f "ios/release.xcconfig" ] ; then
			echo "$IOS_ENV" | tr "|" "\n" > ios/release.xcconfig
		fi
		./node_modules/.bin/react-native run-ios --scheme "MetaMask-Flask"  --configuration Release --simulator "iPhone 13 Pro"
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
	else
		echo "Release E2E Build started..."
		if [ ! -f "ios/release.xcconfig" ] ; then
			echo "$IOS_ENV" | tr "|" "\n" > ios/release.xcconfig
		fi
		cd ios && xcodebuild -workspace MetaMask.xcworkspace -scheme MetaMask -configuration Release -sdk iphonesimulator -derivedDataPath build
	fi
}

buildIosQA(){
  remapEnvVariableQA
	prebuild_ios

  	echo "Start QA build..."

	# Replace release.xcconfig with ENV vars
	if [ "$PRE_RELEASE" = true ] ; then
		echo "Setting up env vars...";
    echo "$IOS_ENV"
		echo "$IOS_ENV" | tr "|" "\n" > $IOS_ENV_FILE
		echo "Build started..."
		brew install watchman
		cd ios
		generateArchivePackages "MetaMask-QA"
	else
		if [ ! -f "ios/release.xcconfig" ] ; then
			echo "$IOS_ENV" | tr "|" "\n" > ios/release.xcconfig
		fi
		./node_modules/.bin/react-native run-ios --scheme MetaMask-QA--configuration Release --simulator "iPhone 13 Pro"
	fi
}


buildAndroidQA(){
  remapEnvVariableQA
  
	if [ "$PRE_RELEASE" = false ] ; then
		adb uninstall io.metamask.qa
	fi

	prebuild_android

	# Generate APK
	cd android && ./gradlew assembleQaRelease -x app:createBundleFlaskDebugJsAndAssets --no-daemon --max-workers 2

	# GENERATE BUNDLE
	if [ "$GENERATE_BUNDLE" = true ] ; then
		./gradlew bundleQaRelease
	fi

	if [ "$PRE_RELEASE" = true ] ; then
		# Generate checksum
		yarn build:android:checksum:qa
	fi

	 if [ "$PRE_RELEASE" = false ] ; then
	 	adb install app/build/outputs/apk/qa/release/app-qa-release.apk
	 fi
}

buildAndroidRelease(){

  remapEnvVariableRelease

	if [ "$PRE_RELEASE" = false ] ; then
		adb uninstall io.metamask || true
	fi

	# Enable Sentry to auto upload source maps and debug symbols
	export SENTRY_DISABLE_AUTO_UPLOAD="false"
	prebuild_android

	# GENERATE APK
	cd android && ./gradlew assembleProdRelease -x app:createBundleFlaskDebugJsAndAssets --no-daemon --max-workers 2

	# GENERATE BUNDLE
	if [ "$GENERATE_BUNDLE" = true ] ; then
		./gradlew bundleProdRelease
	fi

	if [ "$PRE_RELEASE" = true ] ; then
		# Generate checksum
		yarn build:android:checksum
	fi

	if [ "$PRE_RELEASE" = false ] ; then
		adb install app/build/outputs/apk/prod/release/app-prod-release.apk
	fi
}

buildAndroidFlaskRelease(){
	# remap flask env variables to match what the app expects
	remapFlaskEnvVariables

	if [ "$PRE_RELEASE" = false ] ; then
		adb uninstall io.metamask.flask || true
	fi
	prebuild_android

	# GENERATE APK
	cd android && ./gradlew assembleFlaskRelease -x app:createBundleQaDebugJsAndAssets --no-daemon --max-workers 2

	# GENERATE BUNDLE
	if [ "$GENERATE_BUNDLE" = true ] ; then
		./gradlew bundleFlaskRelease
	fi

	if [ "$PRE_RELEASE" = true ] ; then
		# Generate checksum
		yarn build:android:checksum:flask
	fi

	if [ "$PRE_RELEASE" = false ] ; then
		adb install app/build/outputs/apk/flask/release/app-flask-release.apk
	fi
}

buildAndroidReleaseE2E(){
	prebuild_android
	cd android && ./gradlew assembleProdRelease app:assembleProdReleaseAndroidTest -PminSdkVersion=26 -DtestBuildType=release -x app:createBundleFlaskDebugJsAndAssets
}

buildAndroidQAE2E(){
	prebuild_android
	cd android && ./gradlew assembleQaRelease app:assembleQaReleaseAndroidTest -PminSdkVersion=26 -DtestBuildType=release -x app:createBundleFlaskDebugJsAndAssets
}

buildAndroid() {
	if [ "$MODE" == "release" ] ; then
		buildAndroidRelease
	elif [ "$MODE" == "flask" ] ; then
		buildAndroidFlaskRelease
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
	elif [ "$MODE" == "flaskDebug" ] ; then
		buildAndroidRunFlask
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
	cd android && ./gradlew assembleProdDebug app:assembleAndroidTest -DtestBuildType=debug -x app:createBundleQaDebugJsAndAssets -x app:createBundleFlaskDebugJsAndAssets --build-cache --parallel && cd ..
}

buildIos() {
	echo "Build iOS $MODE started..."
	if [ "$MODE" == "release" ] ; then
		buildIosRelease
	elif [ "$MODE" == "flask" ] ; then
		buildIosFlaskRelease
	elif [ "$MODE" == "releaseE2E" ] ; then
		buildIosReleaseE2E
  elif [ "$MODE" == "debugE2E" ] ; then
		buildIosSimulatorE2E
  elif [ "$MODE" == "qadebugE2E" ] ; then
		buildIosQASimulatorE2E
	elif [ "$MODE" == "QA" ] ; then
		buildIosQA
	elif [ "$MODE" == "qaDebug" ] ; then
		if [ "$RUN_DEVICE" = true ] ; then
			buildIosDeviceQA
		else
			buildIosSimulatorQA
		fi
	elif [ "$MODE" == "flaskDebug" ] ; then
		if [ "$RUN_DEVICE" = true ] ; then
			buildIosDeviceFlask
		else
			buildIosSimulatorFlask
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
  WATCHER_PORT=${WATCHER_PORT:-8081}
	yarn --ignore-engines build:static-logos
	if [ "$MODE" == "clean" ]; then
		watchman watch-del-all
		rm -rf $TMPDIR/metro-cache
		react-native start --port=$WATCHER_PORT -- --reset-cache
	else
		react-native start --port=$WATCHER_PORT
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
loadJSEnv
if [ "$MODE" == "releaseE2E" ] || [ "$MODE" == "QA" ] || [ "$MODE" == "QAE2E" ]; then
	echo "DEBUG SENTRY PROPS"
	checkAuthToken 'sentry.debug.properties'
	export SENTRY_PROPERTIES="${REPO_ROOT_DIR}/sentry.debug.properties"
elif [ "$MODE" == "release" ] || [ "$MODE" == "flask" ]; then
	echo "RELEASE SENTRY PROPS"
	checkAuthToken 'sentry.release.properties'
	export SENTRY_PROPERTIES="${REPO_ROOT_DIR}/sentry.release.properties"
fi

if [ -z "$METAMASK_BUILD_TYPE" ]; then
	printError "Missing METAMASK_BUILD_TYPE; set to 'main' for a standard release, or 'flask' for a canary flask release. The default value is 'main'."
	exit 1
else
    echo "METAMASK_BUILD_TYPE is set to: $METAMASK_BUILD_TYPE"
fi

if [ -z "$METAMASK_ENVIRONMENT" ]; then
	printError "Missing METAMASK_ENVIRONMENT; set to 'production' for a production release, 'prerelease' for a pre-release, or 'local' otherwise"
	exit 1
else
    echo "METAMASK_ENVIRONMENT is set to: $METAMASK_ENVIRONMENT"
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
