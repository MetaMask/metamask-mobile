#!/usr/bin/env bash
set -euo pipefail

PR_NUMBER="${BITRISE_PULL_REQUEST:-}"
echo "BITRISE_PULL_REQUEST=${PR_NUMBER}"

if [ -z "${PR_NUMBER}" ] || [ "${PR_NUMBER}" = "0" ]; then
  echo "BITRISE_PULL_REQUEST is empty; skipping PR comment"
  exit 0
fi

COMMIT_HASH="${BRANCH_COMMIT_HASH:-${BITRISE_GIT_COMMIT:-unknown}}"
PIPELINE_URL="${BITRISEIO_PIPELINE_BUILD_URL:-}"
PIPELINE_TITLE="${BITRISEIO_PIPELINE_TITLE:-}"

export COMMIT_HASH PIPELINE_URL PIPELINE_TITLE

python3 <<'PY'
import json
import os
import textwrap

commit_hash = os.environ.get("COMMIT_HASH", "unknown")
pipeline_url = os.environ.get("PIPELINE_URL", "")
pipeline_title = os.environ.get("PIPELINE_TITLE", "")

body = textwrap.dedent(
    f"""## [<img alt=\"https://bitrise.io/\" src=\"https://assets-global.website-files.com/5db35de024bb983af1b4e151/5e6f9ccc3e129dfd8a205e4e_Bitrise%20Logo%20-%20Eggplant%20Bg.png\" height=\"20\">]({pipeline_url}) **Bitrise**

✅✅✅ `{pipeline_title}` passed on Bitrise! ✅✅✅

Commit hash: {commit_hash}
Build link: {pipeline_url}

>[!NOTE]
>- You can kick off another `{pipeline_title}` on Bitrise by removing and re-applying the `run-ios-e2e-smoke` label on the pull request

<!-- BITRISE_TAG -->
<!-- BITRISE_SUCCESS_TAG -->"""
).strip()

with open("/tmp/pr-comment.json", "w", encoding="utf-8") as fp:
    json.dump({"body": body}, fp)
PY

API_URL="https://api.github.com/repos/${BITRISEIO_GIT_REPOSITORY_OWNER}/${BITRISEIO_GIT_REPOSITORY_SLUG}/issues/${PR_NUMBER}/comments"

HTTP_STATUS=$(curl -s -o /tmp/comment-response.json -w "%{http_code}" \
  -X POST "$API_URL" \
  -H "Authorization: token $GITHUB_ACCESS_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -d @/tmp/pr-comment.json)

if [ "$HTTP_STATUS" != "201" ]; then
  echo "Failed to post PR comment (status $HTTP_STATUS)"
  cat /tmp/comment-response.json
  exit 1
fi

echo "PR comment posted successfully"

