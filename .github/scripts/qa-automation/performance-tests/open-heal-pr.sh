#!/usr/bin/env bash
# Publish a heal branch and open its draft PR without `git push`.
#
# GITHUB_TOKEN has contents: write and pull-requests: write, but no workflows
# scope. `git push` is rejected while GitHub checks whether the push creates or
# updates a workflow, even when the commit only changes scenario caches.
# The Git Data API writes one commit of the changed *.scenario.cache.json files
# (and a reworded *.scenario.md when a repairable heal has one) and never sends
# a workflow file.
set -euo pipefail

: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${BASE_REF:?BASE_REF is required}"
: "${HEAL_BRANCH:?HEAL_BRANCH is required}"
: "${PR_TITLE:?PR_TITLE is required}"
: "${BODY_FILE:?BODY_FILE is required}"

if [[ ! -f "$BODY_FILE" ]]; then
  echo "::error::Heal PR body file does not exist: $BODY_FILE"
  exit 1
fi

case "$HEAL_BRANCH" in
  perf-scenario-heal/*) ;;
  *)
    echo "::error::Refusing to create unexpected branch name: $HEAL_BRANCH"
    exit 1
    ;;
esac

# Run a GitHub API call. On failure print a fixed message plus the response
# body (never the token) and exit.
capture() {
  local what="$1"
  shift
  local err out status
  err="$(mktemp)"
  set +e
  out="$("$@" 2>"$err")"
  status=$?
  set -e
  if [[ $status -ne 0 ]]; then
    echo "::error::${what}"
    if [[ -s "$err" ]]; then
      cat "$err" >&2
    fi
    rm -f "$err"
    exit 1
  fi
  rm -f "$err"
  printf '%s' "$out"
}

require_sha() {
  local value="$1"
  local what="$2"
  if [[ ! "$value" =~ ^[0-9a-fA-F]{40}$ ]]; then
    echo "::error::GitHub API did not return a sha for ${what}."
    if [[ -n "$value" ]]; then
      echo "$value"
    fi
    exit 1
  fi
}

# Only the files a heal is allowed to change. Anything else aborts before the API.
git add -- 'tests/performance/**/*.scenario.cache.json' 'tests/performance/**/*.scenario.md'
if [[ -n "$(git status --porcelain --untracked-files=no | grep -v '^[AM] ' || true)" ]]; then
  echo "::error::Unexpected changes outside scenario caches and Markdown; not opening a PR."
  git status --porcelain
  exit 1
fi

mapfile -t files < <(git diff --cached --name-only --diff-filter=ACMR)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "::error::No scenario cache or Markdown changes to publish."
  exit 1
fi

for file in "${files[@]}"; do
  case "$file" in
    tests/performance/*.scenario.cache.json) ;;
    tests/performance/*.scenario.md) ;;
    *)
      echo "::error::Refusing to publish ${file}. A heal commit may only contain *.scenario.cache.json or *.scenario.md."
      exit 1
      ;;
  esac
done

base_sha="$(capture "Failed to read HEAD of ${BASE_REF}." \
  gh api "repos/${GITHUB_REPOSITORY}/commits/${BASE_REF}" --jq .sha)"
require_sha "$base_sha" "HEAD of ${BASE_REF}"

set +e
create_out="$(gh api --method POST "repos/${GITHUB_REPOSITORY}/git/refs" \
  -f ref="refs/heads/${HEAL_BRANCH}" \
  -f sha="$base_sha" 2>&1)"
create_status=$?
set -e
if [[ $create_status -ne 0 ]]; then
  if [[ "$create_out" == *"Reference already exists"* ]]; then
    echo "Branch ${HEAL_BRANCH} already exists; updating its files."
  else
    echo "::error::Failed to create ${HEAL_BRANCH}."
    echo "$create_out"
    exit 1
  fi
fi

tip="$(capture "Failed to read tip of ${HEAL_BRANCH}." \
  gh api "repos/${GITHUB_REPOSITORY}/commits/${HEAL_BRANCH}" --jq .sha)"
require_sha "$tip" "tip of ${HEAL_BRANCH}"
base_tree="$(capture "Failed to read tree of ${tip}." \
  gh api "repos/${GITHUB_REPOSITORY}/git/commits/${tip}" --jq .tree.sha)"
require_sha "$base_tree" "tree of ${tip}"

entries='[]'
for file in "${files[@]}"; do
  b64="$(base64 -w 0 "$file" 2>/dev/null || base64 < "$file" | tr -d '\n')"
  blob_payload="$(jq -n --arg content "$b64" '{content:$content, encoding:"base64"}')"
  blob_sha="$(capture "Failed to create blob for ${file}." \
    gh api --method POST "repos/${GITHUB_REPOSITORY}/git/blobs" --input - --jq .sha <<< "$blob_payload")"
  require_sha "$blob_sha" "blob ${file}"
  entries="$(jq -n \
    --argjson entries "$entries" \
    --arg path "$file" \
    --arg sha "$blob_sha" \
    '$entries + [{path:$path, mode:"100644", type:"blob", sha:$sha}]')"
done

tree_payload="$(jq -n --arg base_tree "$base_tree" --argjson tree "$entries" '{base_tree:$base_tree, tree:$tree}')"
tree_sha="$(capture "Failed to create heal tree." \
  gh api --method POST "repos/${GITHUB_REPOSITORY}/git/trees" --input - --jq .sha <<< "$tree_payload")"
require_sha "$tree_sha" "heal tree"

commit_payload="$(jq -n \
  --arg message "$PR_TITLE" \
  --arg tree "$tree_sha" \
  --arg parent "$tip" \
  '{message:$message, tree:$tree, parents:[$parent]}')"
commit_sha="$(capture "Failed to create heal commit." \
  gh api --method POST "repos/${GITHUB_REPOSITORY}/git/commits" --input - --jq .sha <<< "$commit_payload")"
require_sha "$commit_sha" "heal commit"

set +e
updated="$(gh api --method PATCH "repos/${GITHUB_REPOSITORY}/git/refs/heads/${HEAL_BRANCH}" \
  -f sha="$commit_sha" -F force=false --jq .object.sha 2>&1)"
update_status=$?
set -e
if [[ $update_status -ne 0 ]]; then
  echo "::error::Failed to point ${HEAL_BRANCH} at ${commit_sha}."
  echo "$updated"
  exit 1
fi
require_sha "$updated" "updated ${HEAL_BRANCH}"

pr_url="$(gh pr create --repo "$GITHUB_REPOSITORY" --draft \
  --base "$BASE_REF" --head "$HEAL_BRANCH" \
  --title "$PR_TITLE" --body-file "$BODY_FILE")"
if [[ -z "$pr_url" ]]; then
  echo "::error::gh pr create did not return a pull request URL."
  exit 1
fi

echo "Opened ${pr_url}"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "pr_url=${pr_url}"
    echo "commit_sha=${commit_sha}"
  } >> "$GITHUB_OUTPUT"
fi
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  echo "Heal PR: ${pr_url}" >> "$GITHUB_STEP_SUMMARY"
fi

for label in team-qa perf-scenario-heal; do
  gh pr edit "$pr_url" --add-label "$label" \
    || echo "::warning::Could not add label ${label} (does it exist?)"
done
