#!/usr/bin/env bash
#
# Pin ota-base/v<package.json version> to that release tag.
#
# Reads package.json from OTA_REF (default HEAD). Creates the base branch
# when it is missing. Refuses to move an existing pin that does not match
# the tag. Prints the branch name on stdout. Logs go to stderr.
#
# Env:
#   OTA_REF    Git ref that contains the OTA commits (default HEAD)
#   GIT_REMOTE Remote to query and update (default origin)

set -euo pipefail

REMOTE="${GIT_REMOTE:-origin}"
OTA_REF="${OTA_REF:-HEAD}"
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

if ! git rev-parse --verify --quiet "${OTA_REF}^{commit}" >/dev/null; then
  echo "::error::OTA ref ${OTA_REF} is not a commit" >&2
  exit 1
fi

VERSION=$(git show "${OTA_REF}:package.json" | node -e '
let raw = "";
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  const version = JSON.parse(raw).version;
  if (typeof version !== "string") {
    process.exit(2);
  }
  process.stdout.write(version);
});
')

if ! [[ "$VERSION" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  echo "::error::package.json version is not strict X.Y.Z, got: ${VERSION}" >&2
  exit 1
fi

TAG="v${VERSION}"
if ! git rev-parse --verify --quiet "refs/tags/${TAG}^{}" >/dev/null; then
  git fetch "$REMOTE" "refs/tags/${TAG}:refs/tags/${TAG}" || true
fi

TAG_SHA=""
if git rev-parse --verify --quiet "refs/tags/${TAG}^{}" >/dev/null; then
  TAG_SHA=$(git rev-parse "refs/tags/${TAG}^{}")
fi

BASE_BRANCH_SHA=$(git ls-remote "$REMOTE" "refs/heads/ota-base/${TAG}" | awk 'NR==1 { print $1 }')

ANCESTOR=false
if [[ -n "$TAG_SHA" ]] && git merge-base --is-ancestor "$TAG_SHA" "${OTA_REF}^{commit}"; then
  ANCESTOR=true
fi

PLAN=$(
  PACKAGE_VERSION="$VERSION" \
  TAG_SHA="$TAG_SHA" \
  BASE_BRANCH_SHA="$BASE_BRANCH_SHA" \
  TAG_IS_ANCESTOR="$ANCESTOR" \
  node "$SCRIPT_DIR/plan-ota-base-branch.mts"
)
ACTION=$(printf '%s' "$PLAN" | jq -r '.action')
REASON=$(printf '%s' "$PLAN" | jq -r '.reason')
OUT_BRANCH=$(printf '%s' "$PLAN" | jq -r '.branch')
OUT_SHA=$(printf '%s' "$PLAN" | jq -r '.sha')

if [[ "$ACTION" == "fail" ]]; then
  echo "::error::${REASON}" >&2
  exit 1
fi

echo "${REASON}" >&2

if [[ "$ACTION" == "create" ]]; then
  if ! git push "$REMOTE" "${OUT_SHA}:refs/heads/${OUT_BRANCH}"; then
    NOW=$(git ls-remote "$REMOTE" "refs/heads/${OUT_BRANCH}" | awk 'NR==1 { print $1 }')
    if [[ "$NOW" != "$OUT_SHA" ]]; then
      echo "::error::${OUT_BRANCH} is ${NOW:-missing}, not ${TAG} (${OUT_SHA}). Refusing to move the pin." >&2
      exit 1
    fi
    echo "Remote ${OUT_BRANCH} already points at ${OUT_SHA}" >&2
  fi
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "ota_base_branch=${OUT_BRANCH}"
    echo "release_tag=${TAG}"
    echo "release_tag_sha=${OUT_SHA}"
  } >> "$GITHUB_OUTPUT"
fi

printf '%s\n' "$OUT_BRANCH"
