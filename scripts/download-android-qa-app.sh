#!/bin/bash

ANDROID_WORKFLOW_ID="build_android_qa"

OWNER="MetaMask"
REPO="metamask-mobile"

# Check for GitHub token
if [ -z "$GITHUB_ACCESS_TOKEN" ]; then
    echo "Error: GITHUB_TOKEN is not set"
    exit 1
fi

# Get tags with authentication
TAGS_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_ACCESS_TOKEN" \
    "https://api.github.com/repos/$OWNER/$REPO/tags")
if [ -z "$TAGS_RESPONSE" ] || [ "$TAGS_RESPONSE" = "null" ]; then
    echo "Error: Failed to fetch tags"
    echo "Response: $TAGS_RESPONSE"
    exit 1
fi

# Parse tag with error checking
TAG=$(echo "$TAGS_RESPONSE" | jq -r '.[0].name')
if [ -z "$TAG" ] || [ "$TAG" = "null" ]; then
    echo "Error: Failed to parse tag"
    echo "Tags response: $TAGS_RESPONSE"
    exit 1
fi
echo "Latest tag is $TAG"

# Fetch the commit hash with error checking
COMMIT_HASH=$(echo "$TAGS_RESPONSE" | jq -r '.[0].commit.sha')
if [ -z "$COMMIT_HASH" ] || [ "$COMMIT_HASH" = "null" ]; then
    echo "Error: Failed to parse commit hash"
    echo "Tags response: $TAGS_RESPONSE"
    exit 1
fi
echo "Latest commit hash is $COMMIT_HASH"

# Check if the commit hash and tag are defined
if [[ -z "$COMMIT_HASH" || -z "$TAG" ]]; then
    echo "Error: COMMIT_HASH or TAG is undefined"
    echo "COMMIT_HASH: $COMMIT_HASH"
    echo "TAG: $TAG"
    exit 1  # Exit with error status
fi

# Initial URL
URL="https://api.bitrise.io/v0.1/apps/$BITRISE_APP_SLUG/builds?sort_by=created_at&order=desc"
NEXT_TOKEN=""
BUILD_FOUND=false

while true; do
    # Construct URL with next token if available
    if [[ -n "$NEXT_TOKEN" ]]; then
        CURRENT_URL="${URL}&next=${NEXT_TOKEN}"
    else
        CURRENT_URL="$URL"
    fi
    
    echo "Checking page: $CURRENT_URL"
    
    # Make the API call
    RESPONSE=$(curl -s -X GET "$CURRENT_URL" \
        -H 'accept: application/json' \
        -H "Authorization: $BITRISE_API_TOKEN")
    
    # Show matching builds on this page
    MATCHING_BUILD=$(echo "$RESPONSE" | \
        jq --arg workflow "$ANDROID_WORKFLOW_ID" --arg tag "$TAG" --arg commit_hash "$COMMIT_HASH" \
        '.data[] | select(.triggered_workflow == $workflow and .tag == $tag and .commit_hash == $commit_hash) | {workflow: .triggered_workflow, tag: .tag, slug: .slug}')
    
    if [[ -n "$MATCHING_BUILD" ]]; then
        echo "Found matching build:"
        echo "$MATCHING_BUILD"
        BUILD_SLUG=$(echo "$MATCHING_BUILD" | jq -r '.slug')
        BUILD_FOUND=true
        break
    fi
    
    # Get next token
    NEXT_TOKEN=$(echo "$RESPONSE" | jq -r '.paging.next // empty')
    
    # Break if no more pages
    if [[ -z "$NEXT_TOKEN" ]]; then
        echo "No more pages to check."
        break
    fi
    
    echo "Next token: $NEXT_TOKEN"
    echo "-------------------"
done

if [[ "$BUILD_FOUND" == "false" ]]; then
    echo "No matching build found."
    exit 1
fi

# Get artifacts for the build
echo "Fetching artifacts for build: $BUILD_SLUG"
ARTIFACTS_DATA=$(curl -s -X GET \
    "https://api.bitrise.io/v0.1/apps/$BITRISE_APP_SLUG/builds/$BUILD_SLUG/artifacts" \
    -H 'accept: application/json' \
    -H "Authorization: $BITRISE_API_TOKEN")

# Get APK artifact details including metadata
APK_ARTIFACT=$(echo "$ARTIFACTS_DATA" | jq -r '.data[] | 
    select(.artifact_type == "android-apk" and .title == "app-qa-release.apk")')

if [[ -n "$APK_ARTIFACT" ]]; then
    ARTIFACT_SLUG=$(echo "$APK_ARTIFACT" | jq -r '.slug')
    
    # Get detailed artifact info including metadata
    ARTIFACT_DETAILS=$(curl -s -X GET \
        "https://api.bitrise.io/v0.1/apps/$BITRISE_APP_SLUG/builds/$BUILD_SLUG/artifacts/$ARTIFACT_SLUG" \
        -H 'accept: application/json' \
        -H "Authorization: $BITRISE_API_TOKEN")
    
    VERSION_NAME=$(echo "$ARTIFACT_DETAILS" | jq -r '.data.artifact_meta.app_info.version_name')
    VERSION_CODE=$(echo "$ARTIFACT_DETAILS" | jq -r '.data.artifact_meta.app_info.version_code')
    DOWNLOAD_URL=$(echo "$ARTIFACT_DETAILS" | jq -r '.data.expiring_download_url')

    export RELEASE_VERSION_NAME="$VERSION_NAME"
    export RELEASE_VERSION_NUMBER="$VERSION_CODE"

    ## Bitrise environment variables
    envman add --key PRODUCTION_BUILD_NUMBER --value "$VERSION_CODE"
    envman add --key PRODUCTION_BUILD_NAME --value "$VERSION_NAME"


    if [[ -n "$DOWNLOAD_URL" && "$DOWNLOAD_URL" != "null" ]]; then
        echo "Downloading Android APK..."
        
        # Create descriptive filename
        APK_FILENAME="MetaMask-${VERSION_NAME}-${VERSION_CODE}.apk"
        # Download with specific filename
        wget -O "$APK_FILENAME" "$DOWNLOAD_URL"
        
        echo "Android APK downloaded: $APK_FILENAME"
        envman add --key APK_FILE --value "$APK_FILENAME"
        envman add --key UPLOAD_APK_PATH --value "$PWD/$APK_FILENAME"
        # Set the APK path as environment variable
        export APK_PATH="$PWD/$APK_FILENAME"
        
        # Verify file exists and has size
        if [[ -f "$APK_PATH" && -s "$APK_PATH" ]]; then
            echo "Successfully downloaded APK to: $APK_PATH"
        else
            echo "Error: APK download failed or file is empty"
            exit 1
        fi
    else
        echo "Error: No valid download URL provided"
        exit 1
    fi
else
    echo "Android APK not found in artifacts"
    exit 1
fi