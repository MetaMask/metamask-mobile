#!/usr/bin/env bash

set -e
set -u
set -o pipefail

PREVIOUS_VERSION="${1}"
NEW_VERSION="${2}"
RELEASE_BRANCH_PREFIX="test-release/"

if [[ -z $NEW_VERSION ]]; then
  echo "Error: No new version specified."
  exit 1
fi

RELEASE_BRANCH_NAME="${RELEASE_BRANCH_PREFIX}${NEW_VERSION}"
RELEASE_BODY="This is the release candidate for version ${NEW_VERSION}. The test plan can be found at [commit.csv](https://github.com/MetaMask/metamask-mobile/blob/${RELEASE_BRANCH_NAME}/commits.csv)"

git config user.name metamaskbot
git config user.email metamaskbot@users.noreply.github.com

#TODO remove
git checkout chore/changelog-release-automation

git checkout -b "${RELEASE_BRANCH_NAME}"

if ! (git add . && git commit -m "${NEW_VERSION}");
then
    echo "Error: No changes detected."
    exit 1
fi

git push --set-upstream origin "${RELEASE_BRANCH_NAME}"

gh pr create \
  --draft \
  --title "feat: TESTING ${NEW_VERSION}" \
  --body "${RELEASE_BODY}" \
  --head "${RELEASE_BRANCH_NAME}";

#Generate changelog and test plan csv
node ./scripts/generate-rc-commits.mjs "${PREVIOUS_VERSION}" "${RELEASE_BRANCH_NAME}" 
./scripts/changelog-csv.sh  "${RELEASE_BRANCH_NAME}" 
git add ./commits.csv
git commit -am "updated changelog and generated feature test plan"
git push