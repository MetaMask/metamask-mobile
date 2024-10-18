#!/usr/bin/env bash

set -e
set -u
set -o pipefail

PREVIOUS_VERSION="${1}"
NEW_VERSION="${2}"
NEW_VERSION_NUMBER="${3}"
RELEASE_BRANCH_PREFIX="release/"

if [[ -z $NEW_VERSION ]]; then
  echo "Error: No new version specified."
  exit 1
fi

RELEASE_BRANCH_NAME="${RELEASE_BRANCH_PREFIX}${NEW_VERSION}"
CHANGELOG_BRANCH_NAME="chore/${NEW_VERSION}-Changelog"
RELEASE_BODY="This is the release candidate for version ${NEW_VERSION}. The changelog will be found in another PR ${CHANGELOG_BRANCH_NAME}.

  # Team sign-off checklist
  - [ ] team-accounts
  - [ ] team-assets
  - [ ] team-confirmations
  - [ ] team-design-system
  - [ ] team-notifications
  - [ ] team-platform
  - [ ] team-security
  - [ ] team-snaps-platform
  - [ ] team-sdk
  - [ ] team-stake
  - [ ] team-tiger
  - [ ] team-wallet-framework

  # Reference
  - Testing plan sheet - https://docs.google.com/spreadsheets/d/1tsoodlAlyvEUpkkcNcbZ4PM9HuC9cEM80RZeoVv5OCQ/edit?gid=404070372#gid=404070372"

git config user.name metamaskbot
git config user.email metamaskbot@users.noreply.github.com

gh pr create \
  --draft \
  --title "feat: ${NEW_VERSION}" \
  --body "${RELEASE_BODY}" \
  --head "${RELEASE_BRANCH_NAME}";
echo "Release PR Created"

git checkout "${RELEASE_BRANCH_NAME}"
echo "Release Branch Checked Out"

git checkout -b "${CHANGELOG_BRANCH_NAME}"
echo "Changelog Branch Created"

#Bump versions for the release"
SEMVER_VERSION="${NEW_VERSION}" VERSION_NUMBER="${NEW_VERSION_NUMBER}" yarn set-version

#Generate changelog and test plan csv
node ./scripts/generate-rc-commits.mjs "${PREVIOUS_VERSION}" "${RELEASE_BRANCH_NAME}" 
./scripts/changelog-csv.sh  "${RELEASE_BRANCH_NAME}" 

git add ./commits.csv

if ! (git commit -am "updated changelog and generated feature test plan");
then
    echo "Error: No changes detected."
    exit 1
fi

PR_BODY="This is PR updateds the change log for ${NEW_VERSION} and generates the test plan here [commit.csv](https://github.com/MetaMask/metamask-mobile/blob/${RELEASE_BRANCH_NAME}/commits.csv)"

git push --set-upstream origin "${CHANGELOG_BRANCH_NAME}"

gh pr create \
  --draft \
  --title "chore: ${CHANGELOG_BRANCH_NAME}" \
  --body "${PR_BODY}" \
  --base "${RELEASE_BRANCH_NAME}" \
  --head "${CHANGELOG_BRANCH_NAME}";