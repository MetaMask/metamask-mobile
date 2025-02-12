## This script is used to download the release APK created in the build_android_qa workflow.
## It will be used in the e2e tests to upgrade the app.

# Required environment variables from Bitrise
# BITRISE_APP_SLUG - from Bitrise secrets
# BITRISE_API_TOKEN - from Bitrise secrets


# step 1: Fetch builds and filter by workflow name and version
echo "Finding build for workflow $WORKFLOW_NAME and version $VERSION_NAME..."

NEXT_TOKEN=""
BUILD_SLUG=""

while true; do
    # Construct URL with pagination
    URL="https://api.bitrise.io/v0.1/apps/$BITRISE_APP_SLUG/builds?sort_by=created_at&order=desc&status=1"
    if [[ -n "$NEXT_TOKEN" ]]; then
        URL="${URL}&next=${NEXT_TOKEN}"
    fi
    
    # Fetch builds for current page
    RESPONSE=$(curl -s -X GET "$URL" \
        -H 'accept: application/json' \
        -H "Authorization: $BITRISE_API_TOKEN")
    
    # Try to find matching build on this page
    BUILD_SLUG=$(echo "$RESPONSE" | tr -d '\000-\037' | jq -r --arg workflow "$WORKFLOW_NAME" --arg version "$VERSION_NAME" \
        '.data[] | 
        select(
            .triggered_workflow == $workflow and
            (.branch | contains("release/" + $version))
        ) | .slug' | head -n 1)
    
    # If we found a match, break the loop
    if [[ -n "$BUILD_SLUG" ]]; then
        break
    fi
    
    # Get next token
    NEXT_TOKEN=$(echo "$RESPONSE" | tr -d '\000-\037' | jq -r '.paging.next')
    
    # If no next token and no match found, we're done
    if [[ "$NEXT_TOKEN" == "null" ]]; then
        echo "No builds found for workflow $WORKFLOW_NAME with version $VERSION_NAME"
        exit 1
    fi
    
    echo "Checking next page..."
done

echo "Found Build Slug: $BUILD_SLUG"

# Step 2️: Get artifact details for the build
echo "Fetching artifacts..."
ARTIFACT_DATA=$(curl -s -X GET "https://api.bitrise.io/v0.1/apps/$BITRISE_APP_SLUG/builds/$BUILD_SLUG/artifacts" \
  -H 'accept: application/json' \
  -H "Authorization: $BITRISE_API_TOKEN")

# Step 3️: Find matching artifact and get its slug
echo "Looking for matching APK..."
ARTIFACT_SLUG=$(echo $ARTIFACT_DATA | tr -d '\000-\037' | jq -r --arg version_code "$VERSION_CODE" --arg version_name "$VERSION_NAME" \
  '.data[] | select(
    .artifact_type == "android-apk" and
    .title == "app-qa-release.apk" and
    .artifact_meta.app_info.version_code == $version_code and
    .artifact_meta.app_info.version_name == $version_name
  ) | .slug')

if [[ -z "$ARTIFACT_SLUG" ]]; then
  echo "No APK found matching version code $VERSION_CODE and version name $VERSION_NAME"
  exit 1
fi

echo "Found matching artifact: $ARTIFACT_SLUG"

# Step 4️: Get download URL for the artifact
echo "Getting download URL..."
DOWNLOAD_URL=$(curl -s -X GET "https://api.bitrise.io/v0.1/apps/$BITRISE_APP_SLUG/builds/$BUILD_SLUG/artifacts/$ARTIFACT_SLUG" \
  -H 'accept: application/json' \
  -H "Authorization: $BITRISE_API_TOKEN" | tr -d '\000-\037' | jq -r '.data.expiring_download_url')

if [[ -z "$DOWNLOAD_URL" || "$DOWNLOAD_URL" == "null" ]]; then
  echo "Failed to get download URL for artifact"
  exit 1
fi

# Step 5️: Download the APK
echo "Found matching APK. Downloading..."
wget -O "$VERSION_NAME-$VERSION_CODE.apk" "$DOWNLOAD_URL"
echo "Download complete: $VERSION_NAME-$VERSION_CODE.apk"