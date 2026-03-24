#!/usr/bin/env bash
# Fetch the React Native Playground APK from the connect-monorepo GitHub Releases.
#
# Usage:
#   ./scripts/fetch-rn-playground-apk.sh [--version <version>] [--output <path>]
#
# Options:
#   --version <version>   Pin to a specific release version (e.g., "17.0.0").
#                          Defaults to the latest release.
#   --output <path>       Where to save the APK. Defaults to
#                          ./tmp/rn-playground.apk
#
# Environment:
#   GITHUB_TOKEN          Optional. Avoids rate limits on the GitHub API.
#   RN_PLAYGROUND_APK_VERSION  Alternative to --version flag.
#
# The script downloads the rn-playground-<version>.apk asset from the
# MetaMask/connect-monorepo GitHub Release matching the requested version.

set -euo pipefail

REPO="MetaMask/connect-monorepo"
APK_PATTERN="rn-playground-"
OUTPUT_PATH="./tmp/rn-playground.apk"
VERSION="${RN_PLAYGROUND_APK_VERSION:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      VERSION="$2"
      shift 2
      ;;
    --output)
      OUTPUT_PATH="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

AUTH_HEADER=""
if [ -n "${GITHUB_TOKEN:-}" ]; then
  AUTH_HEADER="Authorization: token $GITHUB_TOKEN"
fi

curl_with_auth() {
  if [ -n "$AUTH_HEADER" ]; then
    curl -fsSL -H "$AUTH_HEADER" "$@"
  else
    curl -fsSL "$@"
  fi
}

PKG_SCOPE="@metamask/react-native-playground"

if [ -z "$VERSION" ]; then
  echo "Fetching latest playground release from $REPO..."
  # The APK lives on a package-scoped release (e.g. @metamask/react-native-playground@0.1.2),
  # not the generic monorepo release. List recent releases and pick the first one whose tag
  # matches the playground package scope.
  RELEASE_JSON=$(curl_with_auth "https://api.github.com/repos/$REPO/releases?per_page=30" \
    | jq --arg scope "$PKG_SCOPE@" 'map(select(.tag_name | startswith($scope))) | first // empty')

  if [ -z "$RELEASE_JSON" ] || [ "$RELEASE_JSON" = "null" ]; then
    echo "Error: No release found with tag matching ${PKG_SCOPE}@* in $REPO" >&2
    exit 1
  fi
else
  VERSION_STRIPPED="${VERSION#v}"
  echo "Fetching playground release $VERSION_STRIPPED from $REPO..."

  # The primary tag format is the package-scoped tag. Fall back to older
  # formats (v<version>, bare version) for backwards compatibility.
  RELEASE_JSON=""
  for TAG_CANDIDATE in "${PKG_SCOPE}@${VERSION_STRIPPED}" "v${VERSION_STRIPPED}" "${VERSION_STRIPPED}"; do
    RELEASE_JSON=$(curl_with_auth "https://api.github.com/repos/$REPO/releases/tags/$TAG_CANDIDATE" 2>/dev/null || true)
    if echo "$RELEASE_JSON" | jq -e '.assets' >/dev/null 2>&1; then
      break
    fi
    RELEASE_JSON=""
  done

  if [ -z "$RELEASE_JSON" ]; then
    echo "Error: Could not find release for version $VERSION in $REPO" >&2
    echo "Tried tags: ${PKG_SCOPE}@${VERSION_STRIPPED}, v${VERSION_STRIPPED}, ${VERSION_STRIPPED}" >&2
    exit 1
  fi
fi

TAG_NAME=$(echo "$RELEASE_JSON" | jq -r '.tag_name')
echo "Release tag: $TAG_NAME"

DOWNLOAD_URL=$(echo "$RELEASE_JSON" | jq -r \
  --arg pattern "$APK_PATTERN" \
  '.assets[] | select(.name | startswith($pattern)) | select(.name | endswith(".apk")) | .browser_download_url' \
  | head -1)

if [ -z "$DOWNLOAD_URL" ] || [ "$DOWNLOAD_URL" = "null" ]; then
  echo "Error: No APK asset matching '${APK_PATTERN}*.apk' found in release $TAG_NAME" >&2
  echo "Available assets:" >&2
  echo "$RELEASE_JSON" | jq -r '.assets[].name' >&2
  exit 1
fi

APK_NAME=$(basename "$DOWNLOAD_URL")
echo "Downloading $APK_NAME..."

OUTPUT_DIR=$(dirname "$OUTPUT_PATH")
mkdir -p "$OUTPUT_DIR"

curl_with_auth -L -o "$OUTPUT_PATH" "$DOWNLOAD_URL"

APK_SIZE=$(du -h "$OUTPUT_PATH" | cut -f1)
echo "Downloaded $APK_NAME ($APK_SIZE) to $OUTPUT_PATH"
