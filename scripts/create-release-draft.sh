#!/bin/bash

# Usage: ./create_release.sh <tag_name>

TAG_NAME=$1
REPO_PATH=$2  # Ensure the script is executed in the repository's root directory

# Navigate to the repository path (if not already there)
cd $REPO_PATH || exit 1

# Get the commit ID for the tag
RELEASE_COMMIT_ID=$(git rev-list -n 1 "$TAG_NAME")

echo "Creating a draft release for tag $TAG_NAME with commit ID $RELEASE_COMMIT_ID"

CHANGELOG_TAG_NAME=${1#v}  # Remove 'v' prefix if present

#Parse the release notes from the CHANGELOG.md file

RELEASE_NOTES=$(awk -v version="$CHANGELOG_TAG_NAME" '
  # Start printing if the line exactly matches the version heading format
  $0 ~ "^## " version " - " {
    printit = 1;
  }
  # Continue printing if printit was set
  printit {
    if (/^## [0-9]+\.[0-9]+\.[0-9]+/ && $0 !~ version) {
      printit = 0; # Stop printing immediately before printing this line
    } else {
      print $0;
    }
  }
' CHANGELOG.md)

# Prepend the header to the release notes
HEADER=$'Thanks for trying out MetaMask Mobile! We really appreciate your feedback 🤗.\n\n## Table of Contents\n- [What’s new](https://github.com/MetaMask/metamask-mobile/blob/main/CHANGELOG.md)\n- [Feedback](https://github.com/MetaMask/metamask-mobile/issues/new?assignees=&labels=&projects=&template=general-issue.yml)\n\n'
FULL_RELEASE_NOTES="$HEADER$RELEASE_NOTES"

# Create a draft release using GitHub CLI
gh release create \
  "$TAG_NAME" \
  --title "$TAG_NAME" \
  --notes "$FULL_RELEASE_NOTES" \
  --target "$RELEASE_COMMIT_ID" \
  --draft
