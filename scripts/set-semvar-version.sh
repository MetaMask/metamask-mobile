#!/usr/bin/env bash

set -e
set -u
set -o pipefail

# Check if exactly one arguments are provided
if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <new_semvar_version>"
    exit 1
fi

SEMVER_VERSION=$1

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
BITRISE_YML_FILE=bitrise.yml
IOS_PROJECT_FILE=ios/MetaMask.xcodeproj/project.pbxproj

semver_to_nat () {
  echo "${1//./}"
}

log_and_exit () {
  echo "$1" && exit 1
}

perform_updates () {

  # update package.json
  tmp="${PACKAGE_JSON_FILE}_temp"
  jq ".version = \"$SEMVER_VERSION\"" $PACKAGE_JSON_FILE > "$tmp"
  mv "$tmp" $PACKAGE_JSON_FILE
  echo "- $PACKAGE_JSON_FILE updated"

  # Check operating system and execute platform-specific sed commands
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS

    # update android/app/build.gradle
    echo "Updating Android build.gradle file..."
    sed -i '' 's/\(\s*versionName \)".*"/\1"'"$SEMVER_VERSION"'"/' "$ANDROID_BUILD_GRADLE_FILE"
    echo "- $ANDROID_BUILD_GRADLE_FILE successfully updated"

    # update bitrise.yml
    echo "Updating Bitrise configuration files..."
    sed -i '' 's/\(\s*VERSION_NAME: \).*/\1'"$SEMVER_VERSION"'/' "$BITRISE_YML_FILE"
    echo "- $BITRISE_YML_FILE successfully updated"

    echo "Updating iOS project settings..."
    sed -i '' 's/\(\s*MARKETING_VERSION = \).*/\1'"$SEMVER_VERSION;"'/' "$IOS_PROJECT_FILE"
    echo "- $IOS_PROJECT_FILE successfully updated"

  else
    # Linux

    # update android/app/build.gradle
    echo "Updating Android build.gradle file..."
    sed -i 's/\(\s*versionName \)".*"/\1"'"$SEMVER_VERSION"'"/' "$ANDROID_BUILD_GRADLE_FILE"
    echo "- $ANDROID_BUILD_GRADLE_FILE updated"

    # update bitrise.yml
    echo "Updating Bitrise configuration files..."
    sed -i 's/\(\s*VERSION_NAME: \).*/\1'"$SEMVER_VERSION"'/' "$BITRISE_YML_FILE"
    echo "- $BITRISE_YML_FILE updated"

    # update ios/MetaMask.xcodeproj/project.pbxproj
    echo "Updating iOS project settings..."
    sed -i 's/\(\s*MARKETING_VERSION = \).*/\1'"$SEMVER_VERSION;"'/' "$IOS_PROJECT_FILE"
    echo "- $IOS_PROJECT_FILE updated"

  fi

  echo "- $ANDROID_BUILD_GRADLE_FILE updated"
  echo "- $BITRISE_YML_FILE updated"
  echo "- $IOS_PROJECT_FILE updated"

  echo "-------------------"
  echo "Files updated with:"
  echo "SEMVER version: $SEMVER_VERSION"
}



# get current numbers
CURRENT_SEMVER=$(awk '/^\s+VERSION_NAME: /{print $2}' $BITRISE_YML_FILE);

# abort if values are empty
if [[ -z $SEMVER_VERSION ]]; then
  log_and_exit "SEMVER_VERSION not specified, aborting!"
fi

# check if SEMVER_VERSION is not valid semver
if ! [[ $SEMVER_VERSION =~ $SEMVER_REGEX ]]; then
  log_and_exit "$SEMVER_VERSION is invalid semver!"
fi

echo "SEMVER_VERSION is valid."
echo -e "-------------------"
echo "Updating files:"

perform_updates
