#!/bin/bash

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Check if the correct number of arguments is provided
if [ "$#" -ne 1 ]; then
    log "Usage: $0 <new_version_number>"
    exit 1
fi

NEW_VERSION="$1"

# Define the files to modify
BITRISE_FILE="../bitrise.yml"
PBXPROJ_FILE="../ios/MetaMask.xcodeproj/project.pbxproj"
GRADLE_FILE="../android/app/build.gradle"

# Update VERSION_NAME and FLASK_VERSION_NAME in bitrise.yml
log "Updating VERSION_NAME and FLASK_VERSION_NAME in $BITRISE_FILE..."
sed -i.bak "s/\(VERSION_NAME: \s*\).*/\1$NEW_VERSION/" "$BITRISE_FILE"
sed -i.bak "s/\(FLASK_VERSION_NAME: \s*\).*/\1$NEW_VERSION/" "$BITRISE_FILE"
log "Updated $BITRISE_FILE successfully."

# Update MARKETING_VERSION in project.pbxproj
log "Updating MARKETING_VERSION in $PBXPROJ_FILE..."
sed -i.bak "s/\(MARKETING_VERSION = \).*\;/\1$NEW_VERSION;/" "$PBXPROJ_FILE"
log "Updated $PBXPROJ_FILE successfully."

# Update versionName in build.gradle
log "Updating versionName in $GRADLE_FILE..."
sed -i.bak "s/\(versionName \).*/\1\"$NEW_VERSION\"/" "$GRADLE_FILE"
log "Updated $GRADLE_FILE successfully."

log "All files updated with version number $NEW_VERSION."
