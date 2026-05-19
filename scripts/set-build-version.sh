#!/usr/bin/env bash

set -e
set -u
set -o pipefail


# Check if exactly one arguments are provided
if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <new_build_version>"
    exit 1
fi

VERSION_NUMBER=$1

NAT='0|[1-9][0-9]*'
ALPHANUM='[0-9]*[A-Za-z-][0-9A-Za-z-]*'
IDENT="$NAT|$ALPHANUM"
FIELD='[0-9A-Za-z-]+'

SEMVER_REGEX="\
^[vV]?\
($NAT)\\.($NAT)\\.($NAT)\
(\\-(${IDENT})(\\.(${IDENT}))*)?\
(\\+${FIELD}(\\.${FIELD})*)?$"

PACKAGE_JSON_FILE=package.json
ANDROID_BUILD_GRADLE_FILE=android/app/build.gradle
IOS_PROJECT_FILE=ios/MetaMask.xcodeproj/project.pbxproj

semver_to_nat () {
  echo "${1//./}"
}

log_and_exit () {
  echo "$1" && exit 1
}

perform_updates () {

  echo "Starting updates with version number: $VERSION_NUMBER"
  echo "----------------------------------------------------"

  # Check operating system and adjust commands accordingly
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS version

    # update android/app/build.gradle
    echo "Updating Android build.gradle file..."
    sed -i '' -E "s/(\s*versionCode )[0-9]+/\1$VERSION_NUMBER/" $ANDROID_BUILD_GRADLE_FILE
    echo "- $ANDROID_BUILD_GRADLE_FILE successfully updated"

    # update ios/MetaMask.xcodeproj/project.pbxproj
    echo "Updating iOS project settings..."
    sed -i '' -E "s/(\s*CURRENT_PROJECT_VERSION = )[0-9]+/\1$VERSION_NUMBER/" $IOS_PROJECT_FILE
    echo "- $IOS_PROJECT_FILE successfully updated"

  else
    # Linux version

    # update android/app/build.gradle
    echo "Updating Android build.gradle file..."
    sed -i -E "s/(\s*versionCode )[0-9]+/\1$VERSION_NUMBER/" $ANDROID_BUILD_GRADLE_FILE
    echo "- $ANDROID_BUILD_GRADLE_FILE successfully updated"

    # update ios/MetaMask.xcodeproj/project.pbxproj
    echo "Updating iOS project settings..."
    sed -i -E "s/(\s*CURRENT_PROJECT_VERSION = )[0-9]+/\1$VERSION_NUMBER/" $IOS_PROJECT_FILE
    echo "- $IOS_PROJECT_FILE successfully updated"
  fi

  echo "----------------------------------------------------"
  echo "All specified files updated with version number: $VERSION_NUMBER"
}

# Extract current build numbers from Android and iOS sources of truth.
# Use POSIX [[:space:]] for cross-platform awk compatibility (macOS BSD awk doesn't support \s).
CURRENT_ANDROID_VERSION_NUMBER=$(awk '/^[[:space:]]+versionCode /{print $2; exit}' $ANDROID_BUILD_GRADLE_FILE)
CURRENT_IOS_VERSION_NUMBER=$(awk -F'[[:space:]=;]+' '/CURRENT_PROJECT_VERSION/{print $3; exit}' $IOS_PROJECT_FILE)

if [[ -z $VERSION_NUMBER ]]; then
  log_and_exit "VERSION_NUMBER not specified, aborting!"
fi

# check if VERSION_NUMBER is not natural number
if ! [[ $VERSION_NUMBER =~ $NAT ]] || [[ $VERSION_NUMBER =~ $SEMVER_REGEX ]]; then
  log_and_exit "$VERSION_NUMBER is not a natural number!"
fi

echo "VERSION_NUMBER is $VERSION_NUMBER."
echo "CURRENT_ANDROID_VERSION_NUMBER is $CURRENT_ANDROID_VERSION_NUMBER."
echo "CURRENT_IOS_VERSION_NUMBER is $CURRENT_IOS_VERSION_NUMBER."

# ensure Android version number goes up
if [[ "$VERSION_NUMBER" -le "$CURRENT_ANDROID_VERSION_NUMBER" ]]; then
  log_and_exit "Android version $VERSION_NUMBER is less than or equal to current: $CURRENT_ANDROID_VERSION_NUMBER"
fi

# ensure iOS version number goes up
if [[ "$VERSION_NUMBER" -le "$CURRENT_IOS_VERSION_NUMBER" ]]; then
  log_and_exit "iOS version $VERSION_NUMBER is less than or equal to current: $CURRENT_IOS_VERSION_NUMBER"
fi

echo "VERSION_NUMBER is valid."
echo -e "-------------------"
echo "Updating files:"

perform_updates
