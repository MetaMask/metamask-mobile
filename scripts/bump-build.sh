#!/bin/bash

# File 1: android/app/build.gradle
#  FRANK: This one works
currentVersion=$(perl -ne '/versionCode (\d+)/ && print $1' ./android/app/build.gradle)
echo "Current version in build.gradle: $currentVersion"
newVersion=$((currentVersion + 1))
echo "New version in build.gradle: $newVersion"
perl -i -pe "s/versionCode $currentVersion/versionCode $newVersion/g" ./android/app/build.gradle

# # File 2: bitrise.yml
#  FRANK: This one works
currentVersion=$(perl -ne '/^\s*VERSION_NUMBER:\s*(\d+).*$/ && print $1' ./bitrise.yml)
echo "Current version in bitrise.yml: $currentVersion"
newVersion=$((${currentVersion:(-4)} + 1))
echo "New version in bitrise.yml: $newVersion"
perl -i -pe "s/^\s*VERSION_NUMBER:\s*(\d+).*$/      VERSION_NUMBER: $newVersion/g" ./bitrise.yml

# File 3: ios/MetaMask.xcodeproj/project.pbxproj
#  FRANK: This one works
currentVersion=$(perl -ne '/^\s*CURRENT_PROJECT_VERSION\s*=\s*(\d+).*$/ && print $1' ./ios/MetaMask.xcodeproj/project.pbxproj)
echo "Current version in project.pbxproj: $currentVersion"
newVersion=$((${currentVersion:(-4)} + 1))
echo "New version in project.pbxproj: $newVersion"
perl -i -pe "s/^\s*CURRENT_PROJECT_VERSION\s*=\s*${currentVersion:(-4)}/                CURRENT_PROJECT_VERSION = $newVersion/g" ./ios/MetaMask.xcodeproj/project.pbxproj

echo "Version numbers have been incremented."