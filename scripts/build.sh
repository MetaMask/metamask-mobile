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
	flavor="$1"
	# Debug or Release
	configuration="${CONFIGURATION:-"Release"}"

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

	# Create flavor configuration
	flavorConfiguration="app:assemble${flavor}${configuration}"

	echo "Generating Android binary for ($flavor) flavor with ($configuration) configuration"
	if [ "$configuration" = "Release" ] ; then
		# Generate Android binary only
		./gradlew $flavorConfiguration --build-cache --parallel
		
		# Generate AAB bundle (not needed for E2E)
		bundleConfiguration="bundle${flavor}Release"
		echo "Generating AAB bundle for ($flavor) flavor with ($configuration) configuration"
		./gradlew $bundleConfiguration

		# Generate checksum
		lowerCaseFlavor=$(echo "$flavor" | tr '[:upper:]' '[:lower:]')
		checkSumCommand="build:android:checksum:${lowerCaseFlavor}"
		echo "Generating checksum for ($flavor) flavor with ($configuration) configuration"
		yarn $checkSumCommand
	elif [ "$configuration" = "Debug" ] ; then
		# Create test configuration
		testConfiguration="app:assemble${flavor}DebugAndroidTest"
		# Generate Android binary
		./gradlew $flavorConfiguration $testConfiguration --build-cache --parallel
	fi

	# Change directory back out
	cd ..
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

buildAndroidReleaseE2E(){
	local flavor="${1:-Prod}"
	local lowerFlavor=$(echo "$flavor" | tr '[:upper:]' '[:lower:]')
	
	prebuild_android
	# Use GitHub CI gradle properties for E2E builds (x86_64 only, optimized memory settings)
	cp android/gradle.properties.github android/gradle.properties
	# E2E builds only need x86_64 for emulator testing, reducing build time and memory usage
	echo "Building E2E APKs for $flavor flavor..."
	cd android
	
	# Try building with optimized settings
	if ! ./gradlew assemble${flavor}Release app:assemble${flavor}ReleaseAndroidTest -PminSdkVersion=26 -DtestBuildType=release; then
		echo "⚠️  Build failed, retrying with reduced parallelism..."
		# Kill any remaining daemon
		./gradlew --stop || true
		# Retry with no parallel builds to reduce memory pressure
		./gradlew assemble${flavor}Release app:assemble${flavor}ReleaseAndroidTest -PminSdkVersion=26 -DtestBuildType=release --no-parallel --max-workers=2
	fi
	
	# Verify APK files were created
	echo ""
	echo "📦 Verifying E2E APK outputs..."
	local appApkPath="app/build/outputs/apk/${lowerFlavor}/release/app-${lowerFlavor}-release.apk"
	local testApkPath="app/build/outputs/apk/androidTest/${lowerFlavor}/release/app-${lowerFlavor}-release-androidTest.apk"
	
	if [ -f "$appApkPath" ]; then
		echo "✅ App APK found: $appApkPath ($(du -h "$appApkPath" | cut -f1))"
	else
		echo "❌ App APK NOT found at: $appApkPath"
		cd ..
		return 1
	fi
	
	if [ -f "$testApkPath" ]; then
		echo "✅ Test APK found: $testApkPath ($(du -h "$testApkPath" | cut -f1))"
	else
		echo "❌ Test APK NOT found at: $testApkPath"
		cd ..
		return 1
	fi
	echo ""
	
	cd ..
}

buildAndroid() {
	echo "Build Android $METAMASK_BUILD_TYPE started..."
	if [ "$METAMASK_BUILD_TYPE" == "release" ] || [ "$METAMASK_BUILD_TYPE" == "main" ] ; then
		if [ "$IS_LOCAL" = true ] ; then
			buildAndroidMainLocal
		elif [ "$METAMASK_ENVIRONMENT" = "e2e" ] && [ "$E2E" = "true" ] ; then
			# E2E builds use a separate function
			buildAndroidReleaseE2E "Prod"
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
		elif [ "$METAMASK_ENVIRONMENT" = "e2e" ] && [ "$E2E" = "true" ] ; then
			# E2E builds use a separate function
			buildAndroidReleaseE2E "Flask"
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
	elif [ "$METAMASK_BUILD_TYPE" == "releaseE2E" ] ; then
		# Legacy E2E build type, defaults to Prod
		buildAndroidReleaseE2E "Prod"
	else
		printError "METAMASK_BUILD_TYPE '${METAMASK_BUILD_TYPE}' is not recognized."
		exit 1
	fi
}

buildIos() {
	echo "Build iOS $METAMASK_BUILD_TYPE started..."
	if [ "$METAMASK_BUILD_TYPE" == "release" ] || [ "$METAMASK_BUILD_TYPE" == "main" ] ; then
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
	elif [ "$METAMASK_BUILD_TYPE" == "releaseE2E" ] ; then
			buildIosReleaseE2E
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
		sed -i'' -e "s/auth.token.*/auth.token=${MM_SENTRY_AUTH_TOKEN}/" "./${propertiesFileName}";
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
			sed -i'' -e "s/auth.token.*/auth.token=${MM_SENTRY_AUTH_TOKEN}/" "./${propertiesFileName}";
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

if [ "$METAMASK_ENVIRONMENT" == "e2e" ]; then
	# Build for simulator
	export IS_SIM_BUILD="true"
	# Ignore Boxlogs for E2E builds
	export IGNORE_BOXLOGS_DEVELOPMENT="true"
fi

if [ "$METAMASK_BUILD_TYPE" == "releaseE2E" ] || [ "$METAMASK_BUILD_TYPE" == "QA" ]; then
	echo "DEBUG SENTRY PROPS"
	checkAuthToken 'sentry.debug.properties'
	export SENTRY_PROPERTIES="${REPO_ROOT_DIR}/sentry.debug.properties"
elif [ "$METAMASK_BUILD_TYPE" == "release" ] || [ "$METAMASK_BUILD_TYPE" == "flask" ] || [ "$METAMASK_BUILD_TYPE" == "main" ]; then
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
	# Update Expo channel configuration based on environment
	echo "Updating Expo channel configuration..."
	node "${__DIRNAME__}/update-expo-channel.js"

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
elif [ "$PLATFORM" == "watcher" ]; then
	startWatcher
fi
