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
SHOULD_CLEAN_WATCHER_CACHE=false
WATCHER_PORT=${WATCHER_PORT:-8081}

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

if [ "$PLATFORM" != "watcher" ]; then
	# Use the values from the environment variables when platform is watcher
	export METAMASK_BUILD_TYPE=${MODE:-"$METAMASK_BUILD_TYPE"}
	export METAMASK_ENVIRONMENT=${ENVIRONMENT:-"$METAMASK_ENVIRONMENT"}
fi

# Enable Sentry to auto upload source maps and debug symbols
export SENTRY_DISABLE_AUTO_UPLOAD=${SENTRY_DISABLE_AUTO_UPLOAD:-"true"}
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
	echo "  🚀 BUILDING $PLATFORM for $METAMASK_BUILD_TYPE target with $METAMASK_ENVIRONMENT environment" | tr [a-z] [A-Z]
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

	# Check if the --clean flag is present
	if [[ "$*" == *"--clean"* ]]; then
		# Clean watcher cache
		SHOULD_CLEAN_WATCHER_CACHE=true
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

	VALID_METAMASK_BUILD_TYPES="main|flask|qa"
	# Check if the METAMASK_BUILD_TYPE is valid
	case "${METAMASK_BUILD_TYPE}" in
		main|flask|qa)
			# Valid build type - continue
			;;
		*)
			# Invalid build type - exit with error
			printError "METAMASK_BUILD_TYPE '${METAMASK_BUILD_TYPE}' is not valid. Please set it to one of the following: ${VALID_METAMASK_BUILD_TYPES}"
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
	remapEnvVariable "SEGMENT_WRITE_KEY_DEV" "SEGMENT_WRITE_KEY"
  	remapEnvVariable "SEGMENT_PROXY_URL_DEV" "SEGMENT_PROXY_URL"
  	remapEnvVariable "SEGMENT_DELETE_API_SOURCE_ID_QA" "SEGMENT_DELETE_API_SOURCE_ID"
  	remapEnvVariable "SEGMENT_REGULATIONS_ENDPOINT_QA" "SEGMENT_REGULATIONS_ENDPOINT"
	# Only dev environment uses the dev DSN, this is for the Sentry project test-metamask-mobile
  	remapEnvVariable "MM_SENTRY_DSN_DEV" "MM_SENTRY_DSN"

		remapEnvVariable "MM_CARD_BAANX_API_CLIENT_KEY_DEV" "MM_CARD_BAANX_API_CLIENT_KEY"
}

remapEnvVariableQA() {
  	echo "Remapping QA env variable names to match QA values"
  	remapEnvVariable "SEGMENT_WRITE_KEY_QA" "SEGMENT_WRITE_KEY"
  	remapEnvVariable "SEGMENT_PROXY_URL_QA" "SEGMENT_PROXY_URL"
  	remapEnvVariable "SEGMENT_DELETE_API_SOURCE_ID_QA" "SEGMENT_DELETE_API_SOURCE_ID"
  	remapEnvVariable "SEGMENT_REGULATIONS_ENDPOINT_QA" "SEGMENT_REGULATIONS_ENDPOINT"

	remapEnvVariable "MAIN_IOS_GOOGLE_CLIENT_ID_UAT" "IOS_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_IOS_GOOGLE_REDIRECT_URI_UAT" "IOS_GOOGLE_REDIRECT_URI"
	remapEnvVariable "MAIN_ANDROID_APPLE_CLIENT_ID_UAT" "ANDROID_APPLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_CLIENT_ID_UAT" "ANDROID_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_SERVER_CLIENT_ID_UAT" "ANDROID_GOOGLE_SERVER_CLIENT_ID"

	remapEnvVariable "MM_CARD_BAANX_API_CLIENT_KEY_UAT" "MM_CARD_BAANX_API_CLIENT_KEY"

}

# Mapping for Main env variables in the e2e environment
remapMainE2EEnvVariables() {
  	echo "Remapping Main target environment variables for the e2e environment"
  	remapEnvVariable "SEGMENT_WRITE_KEY_QA" "SEGMENT_WRITE_KEY"
  	remapEnvVariable "SEGMENT_PROXY_URL_QA" "SEGMENT_PROXY_URL"
  	remapEnvVariable "SEGMENT_DELETE_API_SOURCE_ID_QA" "SEGMENT_DELETE_API_SOURCE_ID"
  	remapEnvVariable "SEGMENT_REGULATIONS_ENDPOINT_QA" "SEGMENT_REGULATIONS_ENDPOINT"

	remapEnvVariable "MAIN_IOS_GOOGLE_CLIENT_ID_UAT" "IOS_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_IOS_GOOGLE_REDIRECT_URI_UAT" "IOS_GOOGLE_REDIRECT_URI"
	remapEnvVariable "MAIN_ANDROID_APPLE_CLIENT_ID_UAT" "ANDROID_APPLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_CLIENT_ID_UAT" "ANDROID_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_SERVER_CLIENT_ID_UAT" "ANDROID_GOOGLE_SERVER_CLIENT_ID"

	remapEnvVariable "MM_CARD_BAANX_API_CLIENT_KEY_UAT" "MM_CARD_BAANX_API_CLIENT_KEY"
}

# Mapping for Main env variables in the test environment
remapMainTestEnvVariables() {
  	echo "Remapping Main target environment variables for the test environment"
  	remapEnvVariable "SEGMENT_WRITE_KEY_QA" "SEGMENT_WRITE_KEY"
  	remapEnvVariable "SEGMENT_PROXY_URL_QA" "SEGMENT_PROXY_URL"
  	remapEnvVariable "SEGMENT_DELETE_API_SOURCE_ID_QA" "SEGMENT_DELETE_API_SOURCE_ID"
  	remapEnvVariable "SEGMENT_REGULATIONS_ENDPOINT_QA" "SEGMENT_REGULATIONS_ENDPOINT"

	remapEnvVariable "MAIN_IOS_GOOGLE_CLIENT_ID_UAT" "IOS_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_IOS_GOOGLE_REDIRECT_URI_UAT" "IOS_GOOGLE_REDIRECT_URI"
	remapEnvVariable "MAIN_ANDROID_APPLE_CLIENT_ID_UAT" "ANDROID_APPLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_CLIENT_ID_UAT" "ANDROID_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_SERVER_CLIENT_ID_UAT" "ANDROID_GOOGLE_SERVER_CLIENT_ID"

	remapEnvVariable "MM_CARD_BAANX_API_CLIENT_KEY_UAT" "MM_CARD_BAANX_API_CLIENT_KEY"
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

	remapEnvVariable "MM_CARD_BAANX_API_CLIENT_KEY_PROD" "MM_CARD_BAANX_API_CLIENT_KEY"
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

	remapEnvVariable "MM_CARD_BAANX_API_CLIENT_KEY_PROD" "MM_CARD_BAANX_API_CLIENT_KEY"
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

	remapEnvVariable "MM_CARD_BAANX_API_CLIENT_KEY_UAT" "MM_CARD_BAANX_API_CLIENT_KEY"
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

	remapEnvVariable "MM_CARD_BAANX_API_CLIENT_KEY_UAT" "MM_CARD_BAANX_API_CLIENT_KEY"
}

# Mapping for Main env variables in the beta environment
remapMainBetaEnvVariables() {
  	echo "Remapping Main target environment variables for the beta environment"
  	remapEnvVariable "SEGMENT_WRITE_KEY_BETA" "SEGMENT_WRITE_KEY"
    remapEnvVariable "SEGMENT_PROXY_URL_BETA" "SEGMENT_PROXY_URL"
    remapEnvVariable "SEGMENT_DELETE_API_SOURCE_ID_QA" "SEGMENT_DELETE_API_SOURCE_ID"
    remapEnvVariable "SEGMENT_REGULATIONS_ENDPOINT_QA" "SEGMENT_REGULATIONS_ENDPOINT"

	remapEnvVariable "MAIN_IOS_GOOGLE_CLIENT_ID_PROD" "IOS_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_IOS_GOOGLE_REDIRECT_URI_PROD" "IOS_GOOGLE_REDIRECT_URI"
	remapEnvVariable "MAIN_ANDROID_APPLE_CLIENT_ID_PROD" "ANDROID_APPLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_CLIENT_ID_PROD" "ANDROID_GOOGLE_CLIENT_ID"
	remapEnvVariable "MAIN_ANDROID_GOOGLE_SERVER_CLIENT_ID_PROD" "ANDROID_GOOGLE_SERVER_CLIENT_ID"

	remapEnvVariable "MM_CARD_BAANX_API_CLIENT_KEY_PROD" "MM_CARD_BAANX_API_CLIENT_KEY"
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

	remapEnvVariable "MM_CARD_BAANX_API_CLIENT_KEY_PROD" "MM_CARD_BAANX_API_CLIENT_KEY"
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

	remapEnvVariable "MM_CARD_BAANX_API_CLIENT_KEY_UAT" "MM_CARD_BAANX_API_CLIENT_KEY"
}

prebuild_ios(){
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

installICULibraries(){
	# Install ICU libraries for Hermes
	echo "Installing ICU libraries for Hermes..."
	
	if [[ "$OSTYPE" == "darwin"* ]]; then
		# macOS - use Homebrew
		brew install icu4c
	else
		# Linux (GitHub CI uses Ubuntu) - use apt-get
		sudo apt-get update && sudo apt-get install -y libicu-dev
	fi
}

prebuild_android(){
	# Install ICU libraries if on Linux
	installICULibraries
	
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
	yarn expo run:ios --no-install --configuration Debug --port $WATCHER_PORT --scheme "MetaMask" --device "$IOS_SIMULATOR"
}

# Builds and installs the Flask iOS app for local development
buildIosFlaskLocal(){
	prebuild_ios
	yarn expo run:ios --no-install --configuration Debug --port $WATCHER_PORT --scheme "MetaMask-Flask" --device "$IOS_SIMULATOR"
}

# Builds and installs the QA iOS app for local development
buildIosQALocal(){
  	prebuild_ios
	yarn expo run:ios --no-install --configuration Debug --port $WATCHER_PORT --scheme "MetaMask-QA" --device "$IOS_SIMULATOR"
}

# Generates the iOS binary for the given scheme and configuration
generateIosBinary() {
	scheme="$1"
	configuration="${CONFIGURATION:-"Release"}"

	# Check if configuration is valid
	if [ "$configuration" != "Debug" ] && [ "$configuration" != "Release" ] ; then
		# Configuration is not recognized
		echo "Configuration $configuration is not recognized! Only Debug and Release are supported"
		exit 1
	fi

	# Check if scheme is valid
	if [ "$scheme" != "MetaMask" ] && [ "$scheme" != "MetaMask-QA" ] && [ "$scheme" != "MetaMask-Flask" ] ; then
		# Scheme is not recognized
		echo "Scheme $scheme is not recognized! Only MetaMask, MetaMask-QA, and MetaMask-Flask are supported"
		exit 1
	fi

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

# Generates the Android binary for the given scheme and configuration
generateAndroidBinary() {
	# Prod, Flask, or QA (Deprecated - Do not use)
	local flavor="$1"
	# Lowercase flavor string
	local lowercaseFlavor=$(echo "$flavor" | tr '[:upper:]' '[:lower:]')
	# Debug or Release configuration
	local configuration="${CONFIGURATION:-"Release"}"
	# Lowercase configuration string
	local lowercaseConfiguration=$(echo "$configuration" | tr '[:upper:]' '[:lower:]')
	# Construct assemble task
	local assembleApkTask="app:assemble${flavor}${configuration}"
	# Construct checksum command
	local checkSumCommand="build:android:checksum:${lowercaseFlavor}"
	# Create assemble test APK task
	local assembleTestApkTask=""
	# Define React Native Architecture arg
	local reactNativeArchitecturesArg=""
	# Define Test build type arg
	local testBuildTypeArg=""
	# Define Gradle logging flags for E2E builds
	local gradleLoggingFlags=""

	# Check if configuration is valid
	if [ "$configuration" != "Debug" ] && [ "$configuration" != "Release" ] ; then
		# Configuration is not recognized
		echo "Configuration $configuration is not recognized! Only Debug and Release are supported"
		exit 1
	fi

	# Check if flavor is valid
	if [ "$flavor" != "Prod" ] && [ "$flavor" != "Flask" ] && [ "$flavor" != "Qa" ] ; then
		# Flavor is not recognized
		echo "Flavor $flavor is not recognized! Only Prod, Flask, and Qa (Deprecated - Do not use) are supported"
		exit 1
	fi

	if [ "$configuration" = "Debug" ] || [ "$METAMASK_ENVIRONMENT" = "e2e" ] ; then
		# Define assemble test APK task
		assembleTestApkTask="app:assemble${flavor}${configuration}AndroidTest"
		# Define test build type arg
		testBuildTypeArg="-DtestBuildType=${lowercaseConfiguration}"

		# Memory optimization for E2E builds (Keep an eye out if this breaks outside of E2E CI builds)
		if [ "$METAMASK_ENVIRONMENT" = "e2e" ] ; then
			# Only build for x86_64 for E2E builds
			reactNativeArchitecturesArg="-PreactNativeArchitectures=x86_64"
			# Enable verbose logging for E2E builds to help diagnose build failures
			gradleLoggingFlags="--stacktrace --info"
		fi
	fi

	# Generate Android APKs
	echo "Generating Android binary for ($flavor) flavor with ($configuration) configuration"
	./gradlew $assembleApkTask $assembleTestApkTask $testBuildTypeArg $reactNativeArchitecturesArg $gradleLoggingFlags

	# Skip AAB bundle for E2E environments - AAB cannot be installed on emulators
	# and is only needed for Play Store distribution
	if [ "$configuration" = "Release" ] && [ "$METAMASK_ENVIRONMENT" != "e2e" ] ; then
		# Generate AAB bundle
		bundleConfiguration="bundle${flavor}Release"
		echo "Generating AAB bundle for ($flavor) flavor with ($configuration) configuration"
		./gradlew $bundleConfiguration

		# Generate checksum
		echo "Generating checksum for ($flavor) flavor with ($configuration) configuration"
		yarn $checkSumCommand
	fi

	# Verify APK files were created
	echo ""
	echo "📦 Verifying APK outputs..."
	local appApkPath="app/build/outputs/apk/${lowercaseFlavor}/${lowercaseConfiguration}/app-${lowercaseFlavor}-${lowercaseConfiguration}.apk"
	local testApkPath="app/build/outputs/apk/androidTest/${lowercaseFlavor}/${lowercaseConfiguration}/app-${lowercaseFlavor}-${lowercaseConfiguration}-androidTest.apk"
	
	# Verify APK exists
	if [ -f "$appApkPath" ]; then
		echo "✅ App APK found: $appApkPath ($(du -h "$appApkPath" | cut -f1))"
	else
		echo "❌ App APK NOT found at: $appApkPath"
		cd ..
		return 1
	fi
	
	# Only verify test APK if it was supposed to be built
	if [ -n "$assembleTestApkTask" ]; then
		# Verify test APK exists
		if [ -f "$testApkPath" ]; then
			echo "✅ Test APK found: $testApkPath ($(du -h "$testApkPath" | cut -f1))"
		else
			echo "❌ Test APK NOT found at: $testApkPath"
			cd ..
			return 1
		fi
	fi
	echo ""

	# Change directory back out
	cd ..
}

createEnvFile() {
	echo "📝 Creating .env file from environment variables..."

	# List of environment variable names to export
	local ENV_VARS=(
		"MM_MUSD_CONVERSION_FLOW_ENABLED"
		"MM_NETWORK_UI_REDESIGN_ENABLED"
		"MM_NOTIFICATIONS_UI_ENABLED"
		"MM_PERMISSIONS_SETTINGS_V1_ENABLED"
		"MM_PERPS_BLOCKED_REGIONS"
		"MM_PERPS_ENABLED"
		"MM_PERPS_HIP3_ALLOWLIST_MARKETS"
		"MM_PERPS_HIP3_BLOCKLIST_MARKETS"
		"MM_PERPS_HIP3_ENABLED"
		"MM_SECURITY_ALERTS_API_ENABLED"
		"BRIDGE_USE_DEV_APIS"
		"SEEDLESS_ONBOARDING_ENABLED"
		"RAMP_INTERNAL_BUILD"
		"FEATURES_ANNOUNCEMENTS_ACCESS_TOKEN"
		"FEATURES_ANNOUNCEMENTS_SPACE_ID"
		"SEGMENT_WRITE_KEY"
		"SEGMENT_PROXY_URL"
		"SEGMENT_DELETE_API_SOURCE_ID"
		"SEGMENT_REGULATIONS_ENDPOINT"
		"MM_SENTRY_DSN"
		"MM_SENTRY_AUTH_TOKEN"
		"IOS_GOOGLE_CLIENT_ID"
		"IOS_GOOGLE_REDIRECT_URI"
		"ANDROID_APPLE_CLIENT_ID"
		"ANDROID_GOOGLE_CLIENT_ID"
		"ANDROID_GOOGLE_SERVER_CLIENT_ID"
		"MM_INFURA_PROJECT_ID"
		"MM_BRANCH_KEY_LIVE"
		"MM_BRANCH_KEY_TEST"
		"MM_CARD_BAANX_API_CLIENT_KEY"
		"WALLET_CONNECT_PROJECT_ID"
		"MM_FOX_CODE"
		"FCM_CONFIG_API_KEY"
		"FCM_CONFIG_AUTH_DOMAIN"
		"FCM_CONFIG_STORAGE_BUCKET"
		"FCM_CONFIG_PROJECT_ID"
		"FCM_CONFIG_MESSAGING_SENDER_ID"
		"FCM_CONFIG_APP_ID"
		"FCM_CONFIG_MEASUREMENT_ID"
		"QUICKNODE_MAINNET_URL"
		"QUICKNODE_ARBITRUM_URL"
		"QUICKNODE_AVALANCHE_URL"
		"QUICKNODE_BASE_URL"
		"QUICKNODE_LINEA_MAINNET_URL"
		"QUICKNODE_MONAD_URL"
		"QUICKNODE_OPTIMISM_URL"
		"QUICKNODE_POLYGON_URL"
	)

	# Create .env file and export to GITHUB_ENV
	> .env
	local exported_count=0
	for var in "${ENV_VARS[@]}"; do
		# Check if variable is set (defined), not just non-empty
		# This allows explicitly empty strings to be written to .env
		if [ -n "${!var+x}" ]; then
			value="${!var}"
			echo "${var}=${value}" >> .env
			
			# Export to GITHUB_ENV if running in GitHub Actions
			if [ -n "${GITHUB_ENV:-}" ]; then
				echo "${var}=${value}" >> "$GITHUB_ENV"
			fi
			
			exported_count=$((exported_count + 1))
		fi
	done

	echo "📄 .env file created with ${exported_count} variables"
}

buildExpoUpdate() {
	echo "Build Expo Update $METAMASK_BUILD_TYPE started..."
	
	# Create .env file and export environment variables
	createEnvFile
	
	# Verify .env file was created and source it
	if [ -f ".env" ]; then
		echo "✅ .env file exists at $(pwd)/.env"
		echo "📊 .env file contains $(wc -l < .env | tr -d ' ') lines"
		# Show first few variables (without values for security)
		echo "📝 Sample variables in .env:"
		head -n 5 .env | cut -d= -f1 | sed 's/^/  - /'
		
		# Source the .env file to ensure variables are loaded
		echo "🔄 Sourcing .env file to load variables..."
		set -a  # automatically export all variables
		source .env
		set +a  # turn off automatic export
		echo "✅ .env file sourced successfully"
	else
		echo "⚠️ WARNING: .env file was not created!"
	fi
	
	if [ -z "${EXPO_TOKEN}" ]; then
		echo "::error title=Missing EXPO_TOKEN::EXPO_TOKEN secret is not configured. Cannot authenticate with Expo." >&2
		exit 1
	fi

	# Validate required Expo Update environment variables
	if [ -z "${EXPO_CHANNEL}" ]; then
		echo "::error title=Missing EXPO_CHANNEL::EXPO_CHANNEL environment variable is not set. Cannot publish update." >&2
		exit 1
	fi

		if [ -z "${EXPO_KEY_PRIV}" ]; then
			echo "::error title=Missing EXPO_KEY_PRIV::EXPO_KEY_PRIV secret is not configured. Cannot sign update." >&2
			exit 1
		fi

	# Prepare Expo update signing key
	mkdir -p keys
	echo "Writing Expo private key to ./keys/private-key.pem"
	printf '%s' "${EXPO_KEY_PRIV}" > keys/private-key.pem

	if [ ! -f keys/private-key.pem ]; then
		echo "::error title=Missing signing key::keys/private-key.pem not found. Ensure the signing key step ran successfully." >&2
		exit 1
	fi

	echo "🚀 Publishing EAS update..."

	echo "ℹ️ Git head: $(git rev-parse HEAD)"
	echo "ℹ️ Checking for eas script in package.json..."
	if ! grep -q '"eas": "eas"' package.json; then
		echo "::error title=Missing eas script::package.json does not include an \"eas\" script. Commit hash: $(git rev-parse HEAD)." >&2
		exit 1
	fi

	echo "ℹ️ Available yarn scripts containing eas:"
	yarn run --json | grep '"name":"eas"' || true

	# Run platforms based on OTA_PUSH_PLATFORM environment variable (default: all)
	# Run sequentially to avoid LavaMoat lockdown serializer conflicts
	# when bundling multiple platforms simultaneously
	OTA_PUSH_PLATFORM="${OTA_PUSH_PLATFORM:-all}"
	
	# Track exit codes to ensure failures propagate
	local ios_exit_code=0
	local android_exit_code=0
	
	if [ "$OTA_PUSH_PLATFORM" = "all" ] || [ "$OTA_PUSH_PLATFORM" = "ios" ]; then
		echo "📱 Publishing iOS update..."
		yarn run eas update \
			--platform ios \
			--channel "${EXPO_CHANNEL}" \
			--private-key-path "./keys/private-key.pem" \
			--message "${UPDATE_MESSAGE}" \
			--non-interactive
		ios_exit_code=$?
		
		if [ $ios_exit_code -ne 0 ]; then
			echo "::error title=iOS update failed::iOS EAS update command failed with exit code ${ios_exit_code}" >&2
		fi
	fi

	if [ "$OTA_PUSH_PLATFORM" = "all" ] || [ "$OTA_PUSH_PLATFORM" = "android" ]; then
		echo "🤖 Publishing Android update..."
		yarn run eas update \
			--platform android \
			--channel "${EXPO_CHANNEL}" \
			--private-key-path "./keys/private-key.pem" \
			--message "${UPDATE_MESSAGE}" \
			--non-interactive
		android_exit_code=$?
		
		if [ $android_exit_code -ne 0 ]; then
			echo "::error title=Android update failed::Android EAS update command failed with exit code ${android_exit_code}" >&2
		fi
	fi

	# Check for failures and exit accordingly
	if [ $ios_exit_code -ne 0 ] || [ $android_exit_code -ne 0 ]; then
		echo "::error title=EAS update failed::One or more platform updates failed. iOS exit code: ${ios_exit_code}, Android exit code: ${android_exit_code}" >&2
		exit 1
	fi
	
	if [ "$OTA_PUSH_PLATFORM" = "all" ]; then
		echo "✅ EAS updates published for both platforms"
	else
		echo "✅ EAS update published for ${OTA_PUSH_PLATFORM}"
	fi
}

buildAndroid() {
	echo "Build Android $METAMASK_BUILD_TYPE started..."
	if [ "$METAMASK_BUILD_TYPE" == "main" ] ; then
		if [ "$IS_LOCAL" = true ] ; then
			buildAndroidMainLocal
		else
			# Prepare Android dependencies
			prebuild_android
			# Go to android directory
			cd android
			# Generate Android binary
			generateAndroidBinary "Prod"
		fi
	elif [ "$METAMASK_BUILD_TYPE" == "flask" ] ; then
		if [ "$IS_LOCAL" = true ] ; then
			buildAndroidFlaskLocal
		else
			# Prepare Android dependencies
			prebuild_android
			# Go to android directory
			cd android
			# Generate Android binary
			generateAndroidBinary "Flask"
		fi
	elif [ "$METAMASK_BUILD_TYPE" == "QA" ] || [ "$METAMASK_BUILD_TYPE" == "qa" ] ; then
		if [ "$IS_LOCAL" = true ] ; then
			buildAndroidQALocal
		else
			# Prepare Android dependencies
			prebuild_android
			# Go to android directory
			cd android
			# Generate Android binary
			generateAndroidBinary "Qa"
		fi
	else
		printError "METAMASK_BUILD_TYPE '${METAMASK_BUILD_TYPE}' is not recognized."
		exit 1
	fi
}

buildIos() {
	echo "Build iOS $METAMASK_BUILD_TYPE started..."
	if [ "$METAMASK_BUILD_TYPE" == "main" ] ; then
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
	elif [ "$METAMASK_BUILD_TYPE" == "flask" ] ; then
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
	elif [ "$METAMASK_BUILD_TYPE" == "QA" ] || [ "$METAMASK_BUILD_TYPE" == "qa" ] ; then
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
	else
		printError "METAMASK_BUILD_TYPE '${METAMASK_BUILD_TYPE}' is not recognized"
		exit 1
	fi
}

startWatcher() {
	if [ "$SHOULD_CLEAN_WATCHER_CACHE" = true ]; then
		# Clean watcher cache, then start the watcher
		echo "Cleaning watcher cache and starting the watcher..."
		watchman watch-del-all
		rm -rf $TMPDIR/metro-cache
		yarn expo start --port $WATCHER_PORT --clear
	else
		# Start the watcher
		echo "Starting the watcher..."
		yarn expo start --port $WATCHER_PORT
	fi
}

# TODO: Refactor this check to be environment specific
checkAuthToken() {
	local propertiesFileName="$1"

	if [ -n "${MM_SENTRY_AUTH_TOKEN}" ]; then
		# Use | as delimiter to avoid conflicts with special characters in auth token (e.g., /)
		sed -i'' -e "s|auth.token.*|auth.token=${MM_SENTRY_AUTH_TOKEN}|" "./${propertiesFileName}";
	elif ! grep -qE '^auth.token=[[:alnum:]]+$' "./${propertiesFileName}"; then
		if [ "$METAMASK_ENVIRONMENT" == "production" ]; then
			printError "Missing auth token in '${propertiesFileName}'; add the token, or set it as MM_SENTRY_AUTH_TOKEN"
			exit 1
		else
			echo "Missing auth token in '${propertiesFileName}'; add the token, or set it as MM_SENTRY_AUTH_TOKEN"
		fi
	fi

	if [ ! -e "./${propertiesFileName}" ]; then
		if [ -n "${MM_SENTRY_AUTH_TOKEN}" ]; then
			cp "./${propertiesFileName}.example" "./${propertiesFileName}"
			# Use | as delimiter to avoid conflicts with special characters in auth token (e.g., /)
			sed -i'' -e "s|auth.token.*|auth.token=${MM_SENTRY_AUTH_TOKEN}|" "./${propertiesFileName}";
		else
			if [ "$METAMASK_ENVIRONMENT" == "production" ]; then
				printError "Missing '${propertiesFileName}' file (see '${propertiesFileName}.example' or set MM_SENTRY_AUTH_TOKEN to generate)"
				exit 1
			else
				echo "Missing '${propertiesFileName}' file (see '${propertiesFileName}.example' or set MM_SENTRY_AUTH_TOKEN to generate)"
			fi
		fi
	fi
}

checkParameters "$@"


printTitle

# Map environment variables based on mode.
# TODO: MODE should be renamed to TARGET
# Skip environment variable remapping for expo-update platform
if [ "$PLATFORM" != "expo-update" ]; then
	if [ "$METAMASK_BUILD_TYPE" == "main" ]; then
		export GENERATE_BUNDLE=true # Used only for Android
		export PRE_RELEASE=true # Used mostly for iOS, for Android only deletes old APK and installs new one
		if [ "$METAMASK_ENVIRONMENT" == "production" ]; then
			remapMainProdEnvVariables
		elif [ "$METAMASK_ENVIRONMENT" == "beta" ]; then
			remapMainBetaEnvVariables
		elif [ "$METAMASK_ENVIRONMENT" == "rc" ]; then
			remapMainReleaseCandidateEnvVariables
		elif [ "$METAMASK_ENVIRONMENT" == "exp" ]; then
			remapMainExperimentalEnvVariables
		elif [ "$METAMASK_ENVIRONMENT" == "test" ]; then
			remapMainTestEnvVariables
		elif [ "$METAMASK_ENVIRONMENT" == "e2e" ]; then
			remapMainE2EEnvVariables
		elif [ "$METAMASK_ENVIRONMENT" == "dev" ]; then
			remapMainDevEnvVariables
		fi
	elif [ "$METAMASK_BUILD_TYPE" == "flask" ]; then
		# TODO: Map environment variables based on environment
		if [ "$METAMASK_ENVIRONMENT" == "production" ]; then
			remapFlaskProdEnvVariables
		elif [ "$METAMASK_ENVIRONMENT" == "test" ]; then
			remapFlaskTestEnvVariables
		elif [ "$METAMASK_ENVIRONMENT" == "e2e" ]; then
			remapFlaskE2EEnvVariables
		fi
	elif [ "$METAMASK_BUILD_TYPE" == "qa" ] || [ "$METAMASK_BUILD_TYPE" == "QA" ]; then
		# TODO: Map environment variables based on environment
		remapEnvVariableQA
	fi
fi

if [ "$METAMASK_ENVIRONMENT" == "e2e" ]; then
	# Build for simulator
	export IS_SIM_BUILD="true"
	# Ignore Boxlogs for E2E builds
	export IGNORE_BOXLOGS_DEVELOPMENT="true"
fi

if [ "$METAMASK_BUILD_TYPE" == "QA" ]; then
	echo "DEBUG SENTRY PROPS"
	checkAuthToken 'sentry.debug.properties'
	export SENTRY_PROPERTIES="${REPO_ROOT_DIR}/sentry.debug.properties"
elif [ "$METAMASK_BUILD_TYPE" == "flask" ] || [ "$METAMASK_BUILD_TYPE" == "main" ]; then
	echo "RELEASE SENTRY PROPS"
	checkAuthToken 'sentry.release.properties'
	export SENTRY_PROPERTIES="${REPO_ROOT_DIR}/sentry.release.properties"
fi

# Update Expo channel configuration based on environment
# Skip when running Expo updates, as channel is managed externally in that flow
if [ "$PLATFORM" != "expo-update" ]; then
	echo "Updating Expo channel configuration..."
	node "${__DIRNAME__}/update-expo-channel.js"
fi

if [ "$PLATFORM" == "ios" ]; then
	# we don't care about env file in CI
	if [ -f "$IOS_ENV_FILE" ] || [ "$CI" = true ]; then
		buildIos
	else
		envFileMissing $IOS_ENV_FILE
	fi
elif [ "$PLATFORM" == "android" ]; then
	# we don't care about env file in CI
	if [ -f "$ANDROID_ENV_FILE" ] || [ "$CI" = true ]; then
		buildAndroid
	else
		envFileMissing $ANDROID_ENV_FILE
	fi
elif [ "$PLATFORM" == "expo-update" ]; then
	# we don't care about env file in CI
	buildExpoUpdate
elif [ "$PLATFORM" == "watcher" ]; then
	startWatcher
fi
