#!/bin/bash

# Check if the user provided a version number
if [ -z "$1" ]; then
  echo "Usage: $0 <new_version>"
  exit 1
fi

NEW_VERSION=$1

# Path to the package.json file
PACKAGE_JSON="./package.json"

# Update the version in package.json
sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" $PACKAGE_JSON

# Check if sed command was successful
if [ $? -ne 0 ]; then
  echo "Failed to update version in package.json"
  exit 1
fi

echo "Successfully updated version to $NEW_VERSION in package.json"