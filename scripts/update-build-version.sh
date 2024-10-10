#!/bin/bash

# Get the directory of the current script
SCRIPT_DIR=$(dirname "$0")

# Paths to the files
BUILD_GRADLE="$SCRIPT_DIR/../android/app/build.gradle"
BITRISE_YML="$SCRIPT_DIR/../bitrise.yml"
PROJECT_PBXPROJ="$SCRIPT_DIR/../ios/MetaMask.xcodeproj/project.pbxproj"

# Extract the current versionCode
CURRENT_VERSION_CODE=$(grep 'versionCode' $BUILD_GRADLE | awk '{print $2}')

# Check if grep command was successful
if [ $? -ne 0 ]; then
  echo "Failed to extract current versionCode from build.gradle"
  exit 1
fi

# Increment the versionCode
NEW_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))

# Update versionCode in build.gradle
sed -i '' "s/versionCode $CURRENT_VERSION_CODE/versionCode $NEW_VERSION_CODE/" $BUILD_GRADLE

# Check if sed command was successful
if [ $? -ne 0 ]; then
  echo "Failed to update versionCode in build.gradle"
  exit 1
fi

# Update VERSION_NUMBER and FLASK_VERSION_NUMBER in bitrise.yml
sed -i '' "s/VERSION_NUMBER: .*/VERSION_NUMBER: $NEW_VERSION_CODE/" $BITRISE_YML
sed -i '' "s/FLASK_VERSION_NUMBER: .*/FLASK_VERSION_NUMBER: $NEW_VERSION_CODE/" $BITRISE_YML

# Check if sed command was successful
if [ $? -ne 0 ]; then
  echo "Failed to update version numbers in bitrise.yml"
  exit 1
fi

# Update all instances of CURRENT_PROJECT_VERSION in project.pbxproj
sed -i '' "s/CURRENT_PROJECT_VERSION = [0-9]*/CURRENT_PROJECT_VERSION = $NEW_VERSION_CODE/" $PROJECT_PBXPROJ

# Check if sed command was successful
if [ $? -ne 0 ]; then
  echo "Failed to update CURRENT_PROJECT_VERSION in project.pbxproj"
  exit 1
fi

echo "Successfully updated versionCode to $NEW_VERSION_CODE in build.gradle"
echo "Successfully updated VERSION_NUMBER and FLASK_VERSION_NUMBER to $NEW_VERSION_CODE in bitrise.yml"
echo "Successfully updated CURRENT_PROJECT_VERSION to $NEW_VERSION_CODE in project.pbxproj"