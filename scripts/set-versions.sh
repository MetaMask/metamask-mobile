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

# get current numbers
CURRENT_SEMVER=$(awk '/VERSION_NAME: /{print $2}' bitrise.yml);
CURRENT_VERSION_NUMBER=$(awk '/VERSION_NUMBER: /{print $2}' bitrise.yml);

semver_to_nat () {
  echo "${1//./}"
}

log_and_exit () {
  echo "$1" && exit 1
}

perform_updates () {
  echo -e "creating release\nsemver version: $SEMVER_VERSION\nversion number: $VERSION_NUMBER"

  # update package.json
  tmp="package.json_temp"
  jq --arg semverVersion "$SEMVER_VERSION" '.version = $semverVersion' package.json > "$tmp"
  mv "$tmp" package.json


  # update android/app/build.gradle
  sed -i -e 's/versionCode [0-9]\+/versionCode '"$VERSION_NUMBER"'/' android/app/build.gradle
  sed -i -e 's/versionName ".*"/versionName "'"$SEMVER_VERSION"'"/' android/app/build.gradle


  # update bitrise.yml
  sed -i -e 's/VERSION_NAME: .*/VERSION_NAME: '"$SEMVER_VERSION"'/' bitrise.yml
  sed -i -e 's/VERSION_NUMBER: [0-9]\+/VERSION_NUMBER: '"$VERSION_NUMBER"'/' bitrise.yml

  # update ios/MetaMask.xcodeproj/project.pbxproj
  sed -i -e 's/MARKETING_VERSION = .*/MARKETING_VERSION = '"$SEMVER_VERSION;"'/' ios/MetaMask.xcodeproj/project.pbxproj
  sed -i -e 's/CURRENT_PROJECT_VERSION = [0-9]\+/CURRENT_PROJECT_VERSION = '"$VERSION_NUMBER"'/' ios/MetaMask.xcodeproj/project.pbxproj
}

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

# ensure SEMVER_VERSION goes up
CURRENT_SEMVER_NAT=$(semver_to_nat "$CURRENT_SEMVER")
SEMVER_VERSION_NAT=$(semver_to_nat "$SEMVER_VERSION")

# if [[ "$SEMVER_VERSION_NAT" -le "$CURRENT_SEMVER_NAT" ]]; then
#   echo "semver $SEMVER_VERSION is less than or equal to current: $CURRENT_SEMVER"
#   exit 1
# fi

# ensure VERSION_NUMBER goes up
if [[ "$VERSION_NUMBER" -le "$CURRENT_VERSION_NUMBER" ]]; then
  echo "version $VERSION_NUMBER is less than or equal to current: $CURRENT_VERSION_NUMBER"
  exit 1
fi

echo "VERSION_NUMBER and SEMVER_VERSION are valid"
perform_updates
