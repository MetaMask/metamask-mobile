#!/bin/bash

IOS_WORKFLOW_ID="build_ios_qa"
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
    exit 1
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
    
    # Filter the builds by the workflow, tag, and commit hash
    MATCHING_BUILD=$(echo "$RESPONSE" | \
        jq --arg workflow "$IOS_WORKFLOW_ID" --arg tag "$TAG" --arg commit_hash "$COMMIT_HASH" \
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

# Get IPA artifact details including metadata
IPA_ARTIFACT=$(echo "$ARTIFACTS_DATA" | jq -r '.data[] | 
    select(.artifact_type == "ios-ipa" and .title == "MetaMask-QA.ipa")')

# Get the artifact slug(ID) for the IPA artifact
if [[ -n "$IPA_ARTIFACT" ]]; then
    ARTIFACT_SLUG=$(echo "$IPA_ARTIFACT" | jq -r '.slug')
    
    # Get response from the API for the artifact info including metadata
    ARTIFACT_DETAILS=$(curl -s -X GET \
        "https://api.bitrise.io/v0.1/apps/$BITRISE_APP_SLUG/builds/$BUILD_SLUG/artifacts/$ARTIFACT_SLUG" \
        -H 'accept: application/json' \
        -H "Authorization: $BITRISE_API_TOKEN")
    
    VERSION_NAME=$(echo "$ARTIFACT_DETAILS" | jq -r '.data.artifact_meta.app_info.version')
    VERSION_CODE=$(echo "$ARTIFACT_DETAILS" | jq -r '.data.artifact_meta.app_info.build_number')
    DOWNLOAD_URL=$(echo "$ARTIFACT_DETAILS" | jq -r '.data.expiring_download_url')

    # Export version info
    export RELEASE_VERSION_NAME="$VERSION_NAME"
    export RELEASE_VERSION_NUMBER="$VERSION_CODE"

   ## Bitrise environment variables
    envman add --key PRODUCTION_BUILD_NUMBER --value "$VERSION_CODE"
    envman add --key PRODUCTION_BUILD_NAME --value "$VERSION_NAME"

    if [[ -n "$DOWNLOAD_URL" && "$DOWNLOAD_URL" != "null" ]]; then
        echo "Downloading iOS IPA..."
        
        # Create descriptive filename
        IPA_FILENAME="MetaMask-${VERSION_NAME}-${VERSION_CODE}.ipa"
        
        # Download with specific filename
        wget -O "$IPA_FILENAME" "$DOWNLOAD_URL"
        
        envman add --key IPA_FILE --value "$IPA_FILENAME"
        envman add --key IPA_PATH --value "$PWD/$IPA_FILENAME"

        # Set the IPA path as environment variable
        export IPA_PATH="$PWD/$IPA_FILENAME"
        
        # Verify file exists and has size
        if [[ -f "$IPA_PATH" && -s "$IPA_PATH" ]]; then
            echo "Successfully downloaded IPA to: $IPA_PATH"
        else
            echo "Error: IPA download failed or file is empty"
            exit 1
        fi
    else
        echo "Error: No valid download URL provided"
        exit 1
    fi
else
    echo "iOS IPA not found in artifacts"
    exit 1
fi 

