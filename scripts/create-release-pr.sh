#!/usr/bin/env bash

set -e
set -u
set -o pipefail

PREVIOUS_VERSION="${1}"
NEW_VERSION="${2}"
RELEASE_BRANCH_PREFIX="release/"

if [[ -z $NEW_VERSION ]]; then
  echo "Error: No new version specified."
  exit 1
fi

RELEASE_BRANCH_NAME="${RELEASE_BRANCH_PREFIX}${NEW_VERSION}"
RELEASE_BODY="This is the release candidate for version ${NEW_VERSION}. The test plan can be found at [commit.csv](https://github.com/MetaMask/metamask-mobile/blob/${RELEASE_BRANCH_NAME}/commits.csv)"

git config user.name metamaskbot
git config user.email metamaskbot@users.noreply.github.com

git checkout -b "${RELEASE_BRANCH_NAME}"

if ! (git add . && git commit -m "${NEW_VERSION}");
then
    echo "Error: No changes detected."
    exit 1
fi

git push --set-upstream origin "${RELEASE_BRANCH_NAME}"

gh pr create \
  --draft \
  --title "feat: ${NEW_VERSION}" \
  --body "${RELEASE_BODY}" \
  --head "${RELEASE_BRANCH_NAME}";

CHANGELOG_BRANCH_NAME="${RELEASE_BRANCH_NAME}-Changelog"

git checkout -b "${CHANGELOG_BRANCH_NAME}"

if ! (git add . && git commit -m "${NEW_VERSION}");
then
    echo "Error: No changes detected."
    exit 1
fi

#Generate changelog and test plan csv
node ./scripts/generate-rc-commits.mjs "${PREVIOUS_VERSION}" "${RELEASE_BRANCH_NAME}" 
./scripts/changelog-csv.sh  "${RELEASE_BRANCH_NAME}" 

git add ./commits.csv

git commit -am "updated changelog and generated feature test plan"

PR_BODY="This is PR updateds the change log for ${NEW_VERSION} and generates the test plan here [commit.csv](https://github.com/MetaMask/metamask-mobile/blob/${RELEASE_BRANCH_NAME}/commits.csv)"

git push --set-upstream origin "${CHANGELOG_BRANCH_NAME}"

gh pr create \
  --draft \
  --title "chore: ${CHANGELOG_BRANCH_NAME}" \
  --body "${PR_BODY}" \
  --base "${RELEASE_BRANCH_NAME}" \
  --head "${CHANGELOG_BRANCH_NAME}";