#!/usr/bin/env bash

set -e
set -u
set -o pipefail

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
  jq --arg semverVersion "$SEMVER_VERSION" '.version = $semverVersion' $PACKAGE_JSON_FILE > "$tmp"
  mv "$tmp" $PACKAGE_JSON_FILE
  echo "- $PACKAGE_JSON_FILE updated"


  # update android/app/build.gradle
  sed -e 's/\([[:space:]]*versionCode \)[0-9]\+/\1'"$VERSION_NUMBER"'/' -i '' $ANDROID_BUILD_GRADLE_FILE
  sed -e 's/\([[:space:]]*versionName \)".*"/\1"'"$SEMVER_VERSION"'"/' -i '' $ANDROID_BUILD_GRADLE_FILE
  echo "- $ANDROID_BUILD_GRADLE_FILE updated"


  # update bitrise.yml
  sed -e 's/\([[:space:]]*VERSION_NAME: \).*/\1'"$SEMVER_VERSION"'/' -i '' $BITRISE_YML_FILE
  sed -e 's/\([[:space:]]*VERSION_NUMBER: \)[0-9]\+/\1'"$VERSION_NUMBER"'/' -i '' $BITRISE_YML_FILE
  # update flask version numbers in bitrise.yml
  sed -e 's/\([[:space:]]*VERSION_NUMBER: \)[0-9]\+/\1'"$VERSION_NUMBER"'/' -i '' $BITRISE_YML_FILE
  sed -e 's/\([[:space:]]*FLASK_VERSION_NUMBER: \)[0-9]\+/\1'"$VERSION_NUMBER"'/' -i '' $BITRISE_YML_FILE
  echo "- $BITRISE_YML_FILE updated"


  # update ios/MetaMask.xcodeproj/project.pbxproj
  sed -e 's/\([[:space:]]*MARKETING_VERSION = \).*/\1'"$SEMVER_VERSION;"'/' -i '' $IOS_PROJECT_FILE
  sed -e 's/\([[:space:]]*CURRENT_PROJECT_VERSION = \)[0-9]\+/\1'"$VERSION_NUMBER"'/' -i '' $IOS_PROJECT_FILE
  echo "- $IOS_PROJECT_FILE updated"

  echo -e "-------------------"
  echo -e "files updated with:"
  echo -e "semver version: $SEMVER_VERSION"
  echo -e "version number: $VERSION_NUMBER"

}

# get current numbers
CURRENT_SEMVER=$(awk '/^\s+VERSION_NAME: /{print $2}' $BITRISE_YML_FILE);
CURRENT_VERSION_NUMBER=$(awk '/^\s+VERSION_NUMBER: /{print $2}' $BITRISE_YML_FILE);
CURRENT_FLASK_VERSION_NUMBER=$(awk '/^\s+FLASK_VERSION_NUMBER: /{print $2}' $BITRISE_YML_FILE);

# ensure version number of main variant and flask are aligned
if [[ "$CURRENT_VERSION_NUMBER" != "$CURRENT_FLASK_VERSION_NUMBER" ]]; then
  echo "VERSION_NUMBER $CURRENT_VERSION_NUMBER and FLASK_VERSION_NUMBER $CURRENT_FLASK_VERSION_NUMBER should be the same"
  log_and_exit "Check why they are different and fix it before proceeding"
fi

# abort if values are empty
if [[ -z $SEMVER_VERSION ]]; then
  log_and_exit "SEMVER_VERSION not specified, aborting!"
fi

if [[ -z $VERSION_NUMBER ]]; then
  log_and_exit "VERSION_NUMBER not specified, aborting!"
fi

# check if SEMVER_VERSION is not valid semver
if ! [[ $SEMVER_VERSION =~ $SEMVER_REGEX ]]; then
  log_and_exit "$SEMVER_VERSION is invalid semver!"
fi

# check if VERSION_NUMBER is not natural number
if ! [[ $VERSION_NUMBER =~ $NAT ]] || [[ $VERSION_NUMBER =~ $SEMVER_REGEX ]]; then
  log_and_exit "$VERSION_NUMBER is not a natural number!"
fi

# ensure VERSION_NUMBER goes up
if [[ "$VERSION_NUMBER" -le "$CURRENT_VERSION_NUMBER" ]]; then
  echo "version $VERSION_NUMBER is less than or equal to current: $CURRENT_VERSION_NUMBER"
  exit 1
fi

echo "VERSION_NUMBER and SEMVER_VERSION are valid."
echo -e "-------------------"
echo "Updating files:"

perform_updates
