#!/usr/bin/env bash
# Open a draft PR for a weekly perf-audit Easy fix with a complete mobile PR template body.
#
# Usage:
#   ./scripts/tooling/open-perf-audit-pr.sh TMCU-1258 fix/tmcu-1258-memoize-use-fiat-normalizer \
#     "perf(homepage): memoize useFiatNormalizer return object (TMCU-1258)" \
#     "Memoize the useFiatNormalizer hook return object..." \
#     "yarn jest app/components/Views/Homepage/BalanceBreakdown/hooks/useFiatNormalizer.test.ts"
#
# Requires GH_TOKEN with pull_requests:write (see scripts/tooling/perf-audit-pr-body-template.md).

set -euo pipefail

if [[ $# -lt 5 ]]; then
  echo "Usage: $0 <JIRA_KEY> <BRANCH> <PR_TITLE> <DESCRIPTION> <JEST_PATH>" >&2
  exit 1
fi

JIRA_KEY="$1"
BRANCH="$2"
PR_TITLE="$3"
DESCRIPTION="$4"
JEST_PATH="$5"

JIRA_URL="https://consensyssoftware.atlassian.net/browse/${JIRA_KEY}"
BODY_FILE="$(mktemp)"

cat > "$BODY_FILE" <<EOF
## **Description**

${DESCRIPTION}

## **Changelog**

CHANGELOG entry: null

## **Related issues**

Fixes: [${JIRA_KEY}](${JIRA_URL})

## **Manual testing steps**

\`\`\`gherkin
Feature: ${JIRA_KEY} stable hook return

  Scenario: unit tests pass
    Given the metamask-mobile repository is checked out

    When the developer runs \`yarn jest ${JEST_PATH}\`
    Then all tests pass
\`\`\`

## **Screenshots/Recordings**

N/A — internal hook memoization; no user-facing UI change.

### **Before**

N/A

### **After**

N/A

## **Pre-merge author checklist**

- [ ] I've followed [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) and [MetaMask Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md).
- [ ] I've completed the PR template to the best of my ability
- [ ] I've included tests if applicable
- [ ] I've documented my code using [JSDoc](https://jsdoc.app/) format if applicable
- [ ] I've applied the right labels on the PR (see [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md)). Not required for external contributors.

#### Performance checks (if applicable)

- [ ] I've tested on Android
  - Ideally on a mid-range device; emulator is acceptable
- [ ] I've tested with a power user scenario
  - Use these [power-user SRPs](https://consensyssoftware.atlassian.net/wiki/spaces/TL1/pages/edit-v2/401401446401?draftShareId=9d77e1e1-4bdc-4be1-9ebb-ccd916988d93) to import wallets with many accounts and tokens
- [ ] I've instrumented key operations with Sentry traces for production performance metrics
  - See [\`trace()\`](/app/util/trace.ts) for usage and [\`addToken\`](/app/components/Views/AddAsset/components/AddCustomToken/AddCustomToken.tsx#L274) for an example

## **Pre-merge reviewer checklist**

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.
EOF

if gh pr view --head "$BRANCH" --json url --jq .url 2>/dev/null; then
  PR_NUM="$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')"
  echo "PR exists (#${PR_NUM}); updating body..."
  gh pr edit "$PR_NUM" --body-file "$BODY_FILE"
else
  echo "Creating draft PR..."
  gh pr create --base main --head "$BRANCH" --draft \
    --title "$PR_TITLE" \
    --body-file "$BODY_FILE"
fi

rm -f "$BODY_FILE"
