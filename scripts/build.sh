#!/bin/bash

set -o pipefail

readonly __DIRNAME__="$( cd "${BASH_SOURCE[0]%/*}" && pwd )"
readonly REPO_ROOT_DIR="$(dirname "${__DIRNAME__}")"

PLATFORM=$1
MODE=$2
ENVIRONMENT=$3
PRE_RELEASE=false
JS_ENV_FILE=".js.env"
ANDROID_ENV_FILE=".android.env"
IOS_ENV_FILE=".ios.env"
IS_LOCAL=false

loadJSEnv(){
	# Load JS specific env variables
	if [ "$PRE_RELEASE" = false ] ; then
		if [ -e $JS_ENV_FILE ]
		then
			source $JS_ENV_FILE
		fi
	fi
}

# Load JS env variables
loadJSEnv

# Enable Sentry to auto upload source maps and debug symbols
export SENTRY_DISABLE_AUTO_UPLOAD=${SENTRY_DISABLE_AUTO_UPLOAD:-"true"}
export METAMASK_BUILD_TYPE=${MODE:-"$METAMASK_BUILD_TYPE"}
export METAMASK_ENVIRONMENT=${ENVIRONMENT:-"$METAMASK_ENVIRONMENT"}
export EXPO_NO_TYPESCRIPT_SETUP=1

echo "PLATFORM = $PLATFORM"
echo "MODE = $METAMASK_BUILD_TYPE"
echo "ENVIRONMENT = $METAMASK_ENVIRONMENT"

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
	echo "  🚀 BUILDING $PLATFORM for $MODE target with $ENVIRONMENT environment" | tr [a-z] [A-Z]
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

	# Check if the --pre flag is present
	if [[ "$*" == *"--pre"* ]]; then
		PRE_RELEASE=true
	fi

	# Check if the --local flag is present
	if [[ "$*" == *"--local"* ]]; then
		# Script is running locally
		IS_LOCAL=true
	fi

	# Check if the METAMASK_ENVIRONMENT is valid
	VALID_METAMASK_ENVIRONMENTS="production|beta|rc|exp|test|e2e|dev"
	case "${METAMASK_ENVIRONMENT}" in
		production|beta|rc|exp|test|e2e|dev)
			# Valid environment - continue
			;;
		*)
			# Invalid environment - exit with error
			printError "METAMASK_ENVIRONMENT '${METAMASK_ENVIRONMENT}' is not valid. Please set it to one of the following: ${VALID_METAMASK_ENVIRONMENTS}"
			exit 1
	esac
	
	#TODO: Add check for valid METAMASK_BUILD_TYPE once commands are fully refactored
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

# Mapping for Main env variables in the dev environment
remapMainDevEnvVariables() {
  	echo "Remapping Main target environment variables for the dev environment"
  	remapEnvVariable "MM_SENTRY_DSN_DEV" "MM_SENTRY_DSN"
}

remapEnvVariableQA() {
  	echo "Remapping QA env variable names to match QA values"
  	remapEnvVariable "SEGMENT_WRITE_KEY_QA" "SEGMENT_WRITE_KEY"
  	remapEnvVariable "SEGMENT_PROXY_URL_QA" "SEGMENT_PROXY_URL"
  	remapEnvVariable "SEGMENT_DELETE_API_SOURCE_ID_QA" "SEGMENT_DELETE_API_SOURCE_ID"
  	remapEnvVariable "SEGMENT_REGULATIONS_ENDPOINT_QA" "SEGMENT_REGULATIONS_ENDPOINT"
  	remapEnvVariable "MM_SENTRY_DSN_TEST" "MM_SENTRY_DSN"

	remapEnvVariable "MAIN_IOS_GOOGLE_CLIENT_ID_UAT" "IOS_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_IOS_GOOGLE_REDIRECT_URI_UAT" "IOS_GOOGLE_REDIRECT_URI"
	remapEnvVariable "MAIN_ANDROID_APPLE_CLIENT_ID_UAT" "ANDROID_APPLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_CLIENT_ID_UAT" "ANDROID_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_SERVER_CLIENT_ID_UAT" "ANDROID_GOOGLE_SERVER_CLIENT_ID"
}

# Mapping for Main env variables in the e2e environment
remapMainE2EEnvVariables() {
  	echo "Remapping Main target environment variables for the e2e environment"
  	remapEnvVariable "SEGMENT_WRITE_KEY_QA" "SEGMENT_WRITE_KEY"
  	remapEnvVariable "SEGMENT_PROXY_URL_QA" "SEGMENT_PROXY_URL"
  	remapEnvVariable "SEGMENT_DELETE_API_SOURCE_ID_QA" "SEGMENT_DELETE_API_SOURCE_ID"
  	remapEnvVariable "SEGMENT_REGULATIONS_ENDPOINT_QA" "SEGMENT_REGULATIONS_ENDPOINT"
  	remapEnvVariable "MM_SENTRY_DSN_TEST" "MM_SENTRY_DSN"

	remapEnvVariable "MAIN_IOS_GOOGLE_CLIENT_ID_UAT" "IOS_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_IOS_GOOGLE_REDIRECT_URI_UAT" "IOS_GOOGLE_REDIRECT_URI"
	remapEnvVariable "MAIN_ANDROID_APPLE_CLIENT_ID_UAT" "ANDROID_APPLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_CLIENT_ID_UAT" "ANDROID_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_SERVER_CLIENT_ID_UAT" "ANDROID_GOOGLE_SERVER_CLIENT_ID"
}

# Mapping for Main env variables in the test environment
remapMainTestEnvVariables() {
  	echo "Remapping Main target environment variables for the test environment"
  	remapEnvVariable "SEGMENT_WRITE_KEY_QA" "SEGMENT_WRITE_KEY"
  	remapEnvVariable "SEGMENT_PROXY_URL_QA" "SEGMENT_PROXY_URL"
  	remapEnvVariable "SEGMENT_DELETE_API_SOURCE_ID_QA" "SEGMENT_DELETE_API_SOURCE_ID"
  	remapEnvVariable "SEGMENT_REGULATIONS_ENDPOINT_QA" "SEGMENT_REGULATIONS_ENDPOINT"
  	remapEnvVariable "MM_SENTRY_DSN_TEST" "MM_SENTRY_DSN"

	remapEnvVariable "MAIN_IOS_GOOGLE_CLIENT_ID_UAT" "IOS_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_IOS_GOOGLE_REDIRECT_URI_UAT" "IOS_GOOGLE_REDIRECT_URI"
	remapEnvVariable "MAIN_ANDROID_APPLE_CLIENT_ID_UAT" "ANDROID_APPLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_CLIENT_ID_UAT" "ANDROID_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_SERVER_CLIENT_ID_UAT" "ANDROID_GOOGLE_SERVER_CLIENT_ID"
}

# Mapping for Main env variables in the production environment
remapMainProdEnvVariables() {
  	echo "Remapping release env variable names to match production values"
  	remapEnvVariable "SEGMENT_WRITE_KEY_PROD" "SEGMENT_WRITE_KEY"
  	remapEnvVariable "SEGMENT_PROXY_URL_PROD" "SEGMENT_PROXY_URL"
  	remapEnvVariable "SEGMENT_DELETE_API_SOURCE_ID_PROD" "SEGMENT_DELETE_API_SOURCE_ID"
  	remapEnvVariable "SEGMENT_REGULATIONS_ENDPOINT_PROD" "SEGMENT_REGULATIONS_ENDPOINT"

	remapEnvVariable "MAIN_IOS_GOOGLE_CLIENT_ID_PROD" "IOS_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_IOS_GOOGLE_REDIRECT_URI_PROD" "IOS_GOOGLE_REDIRECT_URI"
	remapEnvVariable "MAIN_ANDROID_APPLE_CLIENT_ID_PROD" "ANDROID_APPLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_CLIENT_ID_PROD" "ANDROID_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_SERVER_CLIENT_ID_PROD" "ANDROID_GOOGLE_SERVER_CLIENT_ID"
}

# Mapping for Flask env variables in the production environment
remapFlaskProdEnvVariables() {
  	echo "Remapping Flask target environment variables for the production environment"
  	remapEnvVariable "SEGMENT_WRITE_KEY_FLASK" "SEGMENT_WRITE_KEY"
  	remapEnvVariable "SEGMENT_PROXY_URL_FLASK" "SEGMENT_PROXY_URL"
  	remapEnvVariable "SEGMENT_DELETE_API_SOURCE_ID_FLASK" "SEGMENT_DELETE_API_SOURCE_ID"
  	remapEnvVariable "SEGMENT_REGULATIONS_ENDPOINT_FLASK" "SEGMENT_REGULATIONS_ENDPOINT"

	remapEnvVariable "FLASK_IOS_GOOGLE_CLIENT_ID_PROD" "IOS_GOOGLE_CLIENT_ID"
	remapEnvVariable "FLASK_IOS_GOOGLE_REDIRECT_URI_PROD" "IOS_GOOGLE_REDIRECT_URI"
	remapEnvVariable "FLASK_ANDROID_APPLE_CLIENT_ID_PROD" "ANDROID_APPLE_CLIENT_ID"
	remapEnvVariable "FLASK_ANDROID_GOOGLE_CLIENT_ID_PROD" "ANDROID_GOOGLE_CLIENT_ID"
	remapEnvVariable "FLASK_ANDROID_GOOGLE_SERVER_CLIENT_ID_PROD" "ANDROID_GOOGLE_SERVER_CLIENT_ID"
}

# Mapping for Flask env variables in the test environment
remapFlaskTestEnvVariables() {
  	echo "Remapping Flask target environment variables for the test environment"
  	remapEnvVariable "SEGMENT_WRITE_KEY_QA" "SEGMENT_WRITE_KEY"
  	remapEnvVariable "SEGMENT_PROXY_URL_QA" "SEGMENT_PROXY_URL"
  	remapEnvVariable "SEGMENT_DELETE_API_SOURCE_ID_QA" "SEGMENT_DELETE_API_SOURCE_ID"
  	remapEnvVariable "SEGMENT_REGULATIONS_ENDPOINT_QA" "SEGMENT_REGULATIONS_ENDPOINT"

	remapEnvVariable "FLASK_IOS_GOOGLE_CLIENT_ID_PROD" "IOS_GOOGLE_CLIENT_ID"
	remapEnvVariable "FLASK_IOS_GOOGLE_REDIRECT_URI_PROD" "IOS_GOOGLE_REDIRECT_URI"
	remapEnvVariable "FLASK_ANDROID_APPLE_CLIENT_ID_PROD" "ANDROID_APPLE_CLIENT_ID"
	remapEnvVariable "FLASK_ANDROID_GOOGLE_CLIENT_ID_PROD" "ANDROID_GOOGLE_CLIENT_ID"
	remapEnvVariable "FLASK_ANDROID_GOOGLE_SERVER_CLIENT_ID_PROD" "ANDROID_GOOGLE_SERVER_CLIENT_ID"
}

# Mapping for Flask env variables in the e2e environment
remapFlaskE2EEnvVariables() {
  	echo "Remapping Flask target environment variables for the e2e environment"
  	remapEnvVariable "SEGMENT_WRITE_KEY_QA" "SEGMENT_WRITE_KEY"
  	remapEnvVariable "SEGMENT_PROXY_URL_QA" "SEGMENT_PROXY_URL"
  	remapEnvVariable "SEGMENT_DELETE_API_SOURCE_ID_QA" "SEGMENT_DELETE_API_SOURCE_ID"
  	remapEnvVariable "SEGMENT_REGULATIONS_ENDPOINT_QA" "SEGMENT_REGULATIONS_ENDPOINT"

	remapEnvVariable "FLASK_IOS_GOOGLE_CLIENT_ID_PROD" "IOS_GOOGLE_CLIENT_ID"
	remapEnvVariable "FLASK_IOS_GOOGLE_REDIRECT_URI_PROD" "IOS_GOOGLE_REDIRECT_URI"
	remapEnvVariable "FLASK_ANDROID_APPLE_CLIENT_ID_PROD" "ANDROID_APPLE_CLIENT_ID"
	remapEnvVariable "FLASK_ANDROID_GOOGLE_CLIENT_ID_PROD" "ANDROID_GOOGLE_CLIENT_ID"
	remapEnvVariable "FLASK_ANDROID_GOOGLE_SERVER_CLIENT_ID_PROD" "ANDROID_GOOGLE_SERVER_CLIENT_ID"
}

# Mapping for Main env variables in the beta environment
remapMainBetaEnvVariables() {
  	echo "Remapping Main target environment variables for the beta environment"
  	remapEnvVariable "SEGMENT_WRITE_KEY_PROD" "SEGMENT_WRITE_KEY"
    remapEnvVariable "SEGMENT_PROXY_URL_PROD" "SEGMENT_PROXY_URL"
    remapEnvVariable "SEGMENT_DELETE_API_SOURCE_ID_PROD" "SEGMENT_DELETE_API_SOURCE_ID"
    remapEnvVariable "SEGMENT_REGULATIONS_ENDPOINT_PROD" "SEGMENT_REGULATIONS_ENDPOINT"

	remapEnvVariable "MAIN_IOS_GOOGLE_CLIENT_ID_PROD" "IOS_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_IOS_GOOGLE_REDIRECT_URI_PROD" "IOS_GOOGLE_REDIRECT_URI"
	remapEnvVariable "MAIN_ANDROID_APPLE_CLIENT_ID_PROD" "ANDROID_APPLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_CLIENT_ID_PROD" "ANDROID_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_SERVER_CLIENT_ID_PROD" "ANDROID_GOOGLE_SERVER_CLIENT_ID"
}

# Mapping for Main env variables in the release candidate environment
remapMainReleaseCandidateEnvVariables() {
  	echo "Remapping Main target environment variables for the release candidate environment"
  	remapEnvVariable "SEGMENT_WRITE_KEY_QA" "SEGMENT_WRITE_KEY"
  	remapEnvVariable "SEGMENT_PROXY_URL_QA" "SEGMENT_PROXY_URL"
  	remapEnvVariable "SEGMENT_DELETE_API_SOURCE_ID_QA" "SEGMENT_DELETE_API_SOURCE_ID"
  	remapEnvVariable "SEGMENT_REGULATIONS_ENDPOINT_QA" "SEGMENT_REGULATIONS_ENDPOINT"

	remapEnvVariable "MAIN_IOS_GOOGLE_CLIENT_ID_PROD" "IOS_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_IOS_GOOGLE_REDIRECT_URI_PROD" "IOS_GOOGLE_REDIRECT_URI"
	remapEnvVariable "MAIN_ANDROID_APPLE_CLIENT_ID_PROD" "ANDROID_APPLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_CLIENT_ID_PROD" "ANDROID_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_SERVER_CLIENT_ID_PROD" "ANDROID_GOOGLE_SERVER_CLIENT_ID"
}

# Mapping for Main env variables in the experimental environment
remapMainExperimentalEnvVariables() {
  	echo "Remapping Main target environment variables for the experimental environment"
  	remapEnvVariable "SEGMENT_WRITE_KEY_QA" "SEGMENT_WRITE_KEY"
  	remapEnvVariable "SEGMENT_PROXY_URL_QA" "SEGMENT_PROXY_URL"
    remapEnvVariable "SEGMENT_DELETE_API_SOURCE_ID_QA" "SEGMENT_DELETE_API_SOURCE_ID"
  	remapEnvVariable "SEGMENT_REGULATIONS_ENDPOINT_QA" "SEGMENT_REGULATIONS_ENDPOINT"
	remapEnvVariable "MAIN_WEB3AUTH_NETWORK_PROD" "WEB3AUTH_NETWORK"

	remapEnvVariable "MAIN_IOS_GOOGLE_CLIENT_ID_UAT" "IOS_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_IOS_GOOGLE_REDIRECT_URI_UAT" "IOS_GOOGLE_REDIRECT_URI"
	remapEnvVariable "MAIN_ANDROID_APPLE_CLIENT_ID_UAT" "ANDROID_APPLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_CLIENT_ID_UAT" "ANDROID_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_SERVER_CLIENT_ID_UAT" "ANDROID_GOOGLE_SERVER_CLIENT_ID"
}

prebuild(){
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
  # Create GoogleService-Info.plist file to be used by the Firebase services.
  # Check if GOOGLE_SERVICES_B64_IOS is set
  if [ ! -z "$GOOGLE_SERVICES_B64_IOS" ]; then
    echo -n $GOOGLE_SERVICES_B64_IOS | base64 -d > ./ios/GoogleServices/GoogleService-Info.plist
    echo "GoogleService-Info.plist has been created successfully."
    # Ensure the file has read and write permissions
    chmod 664 ./ios/GoogleServices/GoogleService-Info.plist
  else
    echo "GOOGLE_SERVICES_B64_IOS is not set in the .env file."
    exit 1
  fi
}

prebuild_android(){
	prebuild
	# Copy JS files for injection
	yes | cp -rf app/core/InpageBridgeWeb3.js android/app/src/main/assets/.
	# Copy fonts with iconset
	yes | cp -rf ./app/fonts/Metamask.ttf ./android/app/src/main/assets/fonts/Metamask.ttf

	#Create google-services.json file to be used by the Firebase services.
	# Check if GOOGLE_SERVICES_B64_ANDROID is set
	if [ ! -z "$GOOGLE_SERVICES_B64_ANDROID" ]; then
		echo -n $GOOGLE_SERVICES_B64_ANDROID | base64 -d > ./android/app/google-services.json
		echo "google-services.json has been created successfully."
		# Ensure the file has read and write permissions
		chmod 664 ./android/app/google-services.json
	else
		echo "GOOGLE_SERVICES_B64_ANDROID is not set in the .env file."
		exit 1
	fi

	if [ "$PRE_RELEASE" = false ] ; then
		if [ -e $ANDROID_ENV_FILE ]
		then
			source $ANDROID_ENV_FILE
		fi
	fi
}

# Builds the Main APK for dev development
buildAndroidMainDev(){
	prebuild_android
	# Generate both APK (for development) and test APK (for E2E testing)
	cd android && ./gradlew app:assembleProdDebug app:assembleProdDebugAndroidTest --build-cache --parallel && cd ..
}

# Builds the Flask APK for dev development
buildAndroidFlaskDev(){
	prebuild_android
	# Generate both APK (for development) and test APK (for E2E testing)
	cd android && ./gradlew app:assembleFlaskDebug app:assembleFlaskDebugAndroidTest --build-cache --parallel && cd ..
}

# Builds the QA APK for dev development
buildAndroidQaDev(){
	prebuild_android
	# Generate both APK (for development) and test APK (for E2E testing)
	cd android && ./gradlew app:assembleQaDebug app:assembleQaDebugAndroidTest --build-cache --parallel && cd ..
}

# Builds and installs the Main APK for local development
buildAndroidMainLocal(){
	prebuild_android
	#react-native run-android --port=$WATCHER_PORT --variant=prodDebug --active-arch-only
	yarn expo run:android --no-install --port $WATCHER_PORT --variant 'prodDebug' --device
}

# Builds and installs the QA APK for local development
buildAndroidQALocal(){
	prebuild_android
	#react-native run-android --port=$WATCHER_PORT --variant=qaDebug --active-arch-only
	yarn expo run:android --no-install --port $WATCHER_PORT --variant 'qaDebug' --device
}

# Builds and installs the Flask APK for local development
buildAndroidFlaskLocal(){
	prebuild_android
	#react-native run-android --port=$WATCHER_PORT --variant=flaskDebug --active-arch-only
	yarn expo run:android --no-install  --port $WATCHER_PORT --variant 'flaskDebug' --device
}

# Builds and installs the Main iOS app for local development
buildIosMainLocal(){
	prebuild_ios
	yarn expo run:ios --no-install --configuration Debug --port $WATCHER_PORT --scheme "MetaMask" --device $IOS_SIMULATOR
}

# Builds and installs the Flask iOS app for local development
buildIosFlaskLocal(){
	prebuild_ios
	yarn expo run:ios --no-install --configuration Debug --port $WATCHER_PORT --scheme "MetaMask-Flask" --device $IOS_SIMULATOR
}

# Builds and installs the QA iOS app for local development
buildIosQALocal(){
  	prebuild_ios
	yarn expo run:ios --no-install --configuration Debug --port $WATCHER_PORT --scheme "MetaMask-QA" --device $IOS_SIMULATOR
}

buildIosSimulatorE2E(){
	prebuild_ios
	cd ios && CC=clang CXX=clang CLANG=clang CLANGPLUSPLUS=clang++ LD=clang LDPLUSPLUS=clang++ xcodebuild -workspace MetaMask.xcworkspace -scheme MetaMask -configuration Debug -sdk iphonesimulator -derivedDataPath build
}

buildIosFlaskSimulatorE2E(){
	prebuild_ios
	cd ios && CC=clang CXX=clang CLANG=clang CLANGPLUSPLUS=clang++ LD=clang LDPLUSPLUS=clang++ xcodebuild -workspace MetaMask.xcworkspace -scheme MetaMask-Flask -configuration Debug -sdk iphonesimulator -derivedDataPath build
}

buildIosQASimulatorE2E(){
	prebuild_ios
	cd ios && xcodebuild -workspace MetaMask.xcworkspace -scheme MetaMask-QA -configuration Debug -sdk iphonesimulator -derivedDataPath build
}

runIosE2E(){
  cd e2e && yarn ios:debug
}

# Generates the iOS binary for the given scheme and configuration
generateIosBinary() {
	scheme="$1"
	configuration="${CONFIGURATION:-"Release"}"

	if [ "$scheme" = "MetaMask" ] ; then
		# Main target
		if [ "$configuration" = "Debug" ] ; then
			# Debug configuration
			exportOptionsPlist="MetaMask/IosExportOptionsMetaMaskDevelopment.plist"
		else
			# Release configuration
			exportOptionsPlist="MetaMask/IosExportOptionsMetaMaskRelease.plist"
		fi
	elif [ "$scheme" = "MetaMask-QA" ] ; then
		# QA target
		if [ "$configuration" = "Debug" ] ; then
			# Debug configuration
			exportOptionsPlist="MetaMask/IosExportOptionsMetaMaskQADevelopment.plist"
		else
			# Release configuration
			exportOptionsPlist="MetaMask/IosExportOptionsMetaMaskQARelease.plist"
		fi
	elif [ "$scheme" = "MetaMask-Flask" ] ; then
		# Flask target
		if [ "$configuration" = "Debug" ] ; then
			# Debug configuration
			exportOptionsPlist="MetaMask/IosExportOptionsMetaMaskFlaskDevelopment.plist"
		else
			# Release configuration
			exportOptionsPlist="MetaMask/IosExportOptionsMetaMaskFlaskRelease.plist"
		fi
	fi

	echo "exportOptionsPlist: $exportOptionsPlist"
	echo "Generating archive packages for $scheme in $configuration configuration"
	if [ "$IS_SIM_BUILD" = "true" ]; then
    	echo "Binary build type: Simulator"
		xcodebuild -workspace MetaMask.xcworkspace -scheme $scheme -configuration $configuration -sdk iphonesimulator -derivedDataPath build
	else
		echo "Binary build type: Device"
		xcodebuild -workspace MetaMask.xcworkspace -scheme $scheme -configuration $configuration archive -archivePath build/$scheme.xcarchive -destination generic/platform=ios
		echo "Generating ipa for $scheme"
		xcodebuild -exportArchive -archivePath build/$scheme.xcarchive -exportPath build/output -exportOptionsPlist $exportOptionsPlist
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
		generateIosBinary "MetaMask"
	else
		echo "Release E2E Build started..."
		if [ ! -f "ios/release.xcconfig" ] ; then
			echo "$IOS_ENV" | tr "|" "\n" > ios/release.xcconfig
		fi
		cd ios && xcodebuild -workspace MetaMask.xcworkspace -scheme MetaMask -configuration Release -sdk iphonesimulator -derivedDataPath build
	fi
}

# Builds the Main APK for production
buildAndroidMainProduction(){
	prebuild_android

	# Generate APK for production
	cd android && ./gradlew app:assembleProdRelease app:assembleProdReleaseAndroidTest -DtestBuildType=release --build-cache --parallel

	# Generate AAB bundle for production
	./gradlew bundleProdRelease

	# Generate checksum
	yarn build:android:checksum

	# Change directory back out
	cd ..
}

# Builds the Flask APK for production
buildAndroidFlaskProduction(){
	prebuild_android

	# Generate APK for production
	cd android && ./gradlew app:assembleFlaskRelease app:assembleFlaskReleaseAndroidTest -DtestBuildType=release --build-cache --parallel

	# Generate AAB bundle for production
	./gradlew bundleFlaskRelease

	# Generate checksum
	yarn build:android:checksum:flask

	# Change directory back out
	cd ..
}

# Builds the QA APK for production
buildAndroidQaProduction(){
	# Builds the QA APK for production
	prebuild_android

	# Generate APK for production
	cd android && ./gradlew app:assembleQaRelease app:assembleQaReleaseAndroidTest -DtestBuildType=release --build-cache --parallel

	# Generate AAB bundle for production
	./gradlew bundleQaRelease

	# Generate checksum
	yarn build:android:checksum:qa

	# Change directory back out
	cd ..
}

buildAndroidReleaseE2E(){
	prebuild_android
	cd android && ./gradlew assembleProdRelease app:assembleProdReleaseAndroidTest -PminSdkVersion=26 -DtestBuildType=release
}

buildAndroid() {
	if [ "$MODE" == "release" ] || [ "$MODE" == "main" ] ; then
		if [ "$IS_LOCAL" = true ] ; then
			buildAndroidMainLocal
		elif [ "$METAMASK_ENVIRONMENT" == "dev" ] ; then
			buildAndroidMainDev
		else
			buildAndroidMainProduction
		fi
	elif [ "$MODE" == "flask" ] ; then
		if [ "$IS_LOCAL" = true ] ; then
			buildAndroidFlaskLocal
		elif [ "$METAMASK_ENVIRONMENT" == "dev" ] ; then
			buildAndroidFlaskDev
		else
			buildAndroidFlaskProduction
		fi
	elif [ "$MODE" == "QA" ] || [ "$MODE" == "qa" ] ; then
		if [ "$IS_LOCAL" = true ] ; then
			buildAndroidQALocal
		elif [ "$METAMASK_ENVIRONMENT" == "dev" ] ; then
			buildAndroidQaDev
		else
			buildAndroidQaProduction
		fi
	elif [ "$MODE" == "releaseE2E" ] ; then
		buildAndroidReleaseE2E
  	elif [ "$MODE" == "debugE2E" ] ; then
		buildAndroidRunE2E
	else
		printError "METAMASK_ENVIRONMENT '${METAMASK_ENVIRONMENT}' is not recognized."
		exit 1
	fi
}

buildAndroidRunE2E(){
	prebuild_android
	if [ -e $ANDROID_ENV_FILE ]
	then
		source $ANDROID_ENV_FILE
	fi
	# Specify specific task name :app:TASKNAME to prevent processing other variants
	cd android && ./gradlew :app:assembleProdDebug :app:assembleProdDebugAndroidTest -PminSdkVersion=26 -DtestBuildType=debug --build-cache && cd ..
}

buildIos() {
	echo "Build iOS $MODE started..."
	if [ "$MODE" == "release" ] || [ "$MODE" == "main" ] ; then
		if [ "$IS_LOCAL" = true ] ; then
			buildIosMainLocal
		else
			# Prepare iOS dependencies
			prebuild_ios
			# Go to ios directory
			cd ios
			# Generate iOS binary
			generateIosBinary "MetaMask"
		fi
	elif [ "$MODE" == "flask" ] ; then
		if [ "$IS_LOCAL" = true ] ; then
			buildIosFlaskLocal
		else
			# Prepare iOS dependencies
			prebuild_ios
			# Go to ios directory
			cd ios
			# Generate iOS binary
			generateIosBinary "MetaMask-Flask"
		fi
	elif [ "$MODE" == "QA" ] || [ "$MODE" == "qa" ] ; then
		if [ "$IS_LOCAL" = true ] ; then
			buildIosQALocal
		else
			# Prepare iOS dependencies
			prebuild_ios
			# Go to ios directory
			cd ios
			# Generate iOS binary
			generateIosBinary "MetaMask-QA"
		fi
	elif [ "$MODE" == "releaseE2E" ] ; then
		buildIosReleaseE2E
	elif [ "$MODE" == "debugE2E" ] ; then
			buildIosSimulatorE2E
	elif [ "$MODE" == "qadebugE2E" ] ; then
			buildIosQASimulatorE2E
	elif [ "$MODE" == "flaskDebugE2E" ] ; then
			buildIosFlaskSimulatorE2E
	else
		printError "METAMASK_ENVIRONMENT '${METAMASK_ENVIRONMENT}' is not recognized"
		exit 1
	fi
}

startWatcher() {
	source $JS_ENV_FILE
	remapMainDevEnvVariables
  	WATCHER_PORT=${WATCHER_PORT:-8081}
	if [ "$MODE" == "clean" ]; then
		watchman watch-del-all
		rm -rf $TMPDIR/metro-cache
		#react-native start --port=$WATCHER_PORT -- --reset-cache
		yarn expo start --port $WATCHER_PORT --clear
	else
		#react-native start --port=$WATCHER_PORT
		yarn expo start --port $WATCHER_PORT
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

# Map environment variables based on mode.
# TODO: MODE should be renamed to TARGET
if [ "$MODE" == "main" ]; then
	export GENERATE_BUNDLE=true # Used only for Android
	export PRE_RELEASE=true # Used mostly for iOS, for Android only deletes old APK and installs new one
	if [ "$ENVIRONMENT" == "production" ]; then
		remapMainProdEnvVariables
	elif [ "$ENVIRONMENT" == "beta" ]; then
		remapMainBetaEnvVariables
	elif [ "$ENVIRONMENT" == "rc" ]; then
		remapMainReleaseCandidateEnvVariables
	elif [ "$ENVIRONMENT" == "exp" ]; then
		remapMainExperimentalEnvVariables
	elif [ "$ENVIRONMENT" == "test" ]; then
		remapMainTestEnvVariables
	elif [ "$ENVIRONMENT" == "e2e" ]; then
		remapMainE2EEnvVariables
	elif [ "$ENVIRONMENT" == "dev" ]; then
		remapMainDevEnvVariables
	fi
elif [ "$MODE" == "flask" ]; then
	# TODO: Map environment variables based on environment
	if [ "$ENVIRONMENT" == "production" ]; then
		remapFlaskProdEnvVariables
	elif [ "$ENVIRONMENT" == "test" ]; then
		remapFlaskTestEnvVariables
	elif [ "$ENVIRONMENT" == "e2e" ]; then
		remapFlaskE2EEnvVariables
	fi
elif [ "$MODE" == "qa" ] || [ "$MODE" == "QA" ]; then
	# TODO: Map environment variables based on environment
	remapEnvVariableQA
fi

if [ "$ENVIRONMENT" == "e2e" ]; then
	# Build for simulator
	export IS_SIM_BUILD="true"
	# Ignore Boxlogs for E2E builds
	export IGNORE_BOXLOGS_DEVELOPMENT="true"
fi

if [ "$MODE" == "releaseE2E" ] || [ "$MODE" == "QA" ]; then
	echo "DEBUG SENTRY PROPS"
	checkAuthToken 'sentry.debug.properties'
	export SENTRY_PROPERTIES="${REPO_ROOT_DIR}/sentry.debug.properties"
elif [ "$MODE" == "release" ] || [ "$MODE" == "flask" ] || [ "$MODE" == "main" ]; then
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
	printError "Missing METAMASK_ENVIRONMENT; set to 'production' for a production release, 'prerelease' for a pre-release, or 'dev' otherwise"
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
