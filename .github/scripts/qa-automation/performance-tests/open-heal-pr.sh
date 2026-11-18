#!/usr/bin/env bash
# Publish a heal branch and open its draft PR without `git push`.
#
# GITHUB_TOKEN has contents: write and pull-requests: write, but no workflows
# scope. `git push` is rejected while GitHub checks whether the push creates or
# updates a workflow, even when the commit only changes scenario caches.
# The Git Data API writes one commit of the changed *.scenario.cache.json files
# and never sends a workflow file.
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

if [[ "$HEAL_BRANCH" != perf-scenario-heal/* ]]; then
  echo "::error::Refusing to create unexpected branch name: $HEAL_BRANCH"
  exit 1
fi

# Run a GitHub API call that must return a sha. On failure print a fixed
# message plus the response (never the token) to stderr and exit; gh writes
# its own error body to stderr.
api_sha() {
  local what="$1"
  shift
  local out=''
  if ! out="$(gh api "$@")" || [[ ! "$out" =~ ^[0-9a-fA-F]{40}$ ]]; then
    echo "::error::${what}" >&2
    if [[ -n "$out" ]]; then echo "$out" >&2; fi
    exit 1
  fi
  printf '%s' "$out"
}

# Only scenario caches may be published. Anything else aborts before the API.
git add -- 'tests/performance/**/*.scenario.cache.json'
mapfile -t files < <(git diff --cached --name-only --diff-filter=ACMR)
for file in "${files[@]}"; do
  if [[ "$file" != tests/performance/*.scenario.cache.json ]]; then
    echo "::error::Refusing to publish ${file}. A heal commit may only contain *.scenario.cache.json."
    exit 1
  fi
done
if [[ -n "$(git status --porcelain --untracked-files=no | grep -v '^[AM] ' || true)" ]]; then
  echo "::error::Unexpected changes outside scenario caches; not opening a PR."
  git status --porcelain
  exit 1
fi
if [[ ${#files[@]} -eq 0 ]]; then
  echo "::error::No scenario cache changes to publish."
  exit 1
fi

repo_api="repos/${GITHUB_REPOSITORY}"
base_sha="$(api_sha "Failed to read HEAD of ${BASE_REF}." "${repo_api}/commits/${BASE_REF}" --jq .sha)"

if ! create_out="$(gh api --method POST "${repo_api}/git/refs" \
  -f ref="refs/heads/${HEAL_BRANCH}" -f sha="$base_sha" 2>&1)"; then
  if [[ "$create_out" != *"Reference already exists"* ]]; then
    echo "::error::Failed to create ${HEAL_BRANCH}."
    echo "$create_out"
    exit 1
  fi
  echo "Branch ${HEAL_BRANCH} already exists; updating its files."
fi

tip="$(api_sha "Failed to read tip of ${HEAL_BRANCH}." "${repo_api}/commits/${HEAL_BRANCH}" --jq .sha)"
base_tree="$(api_sha "Failed to read tree of ${tip}." "${repo_api}/git/commits/${tip}" --jq .tree.sha)"

entries='[]'
for file in "${files[@]}"; do
  b64="$(base64 -w 0 "$file" 2>/dev/null || base64 < "$file" | tr -d '\n')"
  blob_sha="$(jq -n --arg content "$b64" '{content:$content, encoding:"base64"}' |
    api_sha "Failed to create blob for ${file}." --method POST "${repo_api}/git/blobs" --input - --jq .sha)"
  entries="$(jq -n --argjson entries "$entries" --arg path "$file" --arg sha "$blob_sha" \
    '$entries + [{path:$path, mode:"100644", type:"blob", sha:$sha}]')"
done

tree_sha="$(jq -n --arg base_tree "$base_tree" --argjson tree "$entries" '{base_tree:$base_tree, tree:$tree}' |
  api_sha "Failed to create heal tree." --method POST "${repo_api}/git/trees" --input - --jq .sha)"
commit_sha="$(jq -n --arg message "$PR_TITLE" --arg tree "$tree_sha" --arg parent "$tip" \
  '{message:$message, tree:$tree, parents:[$parent]}' |
  api_sha "Failed to create heal commit." --method POST "${repo_api}/git/commits" --input - --jq .sha)"
api_sha "Failed to point ${HEAL_BRANCH} at ${commit_sha}." --method PATCH \
  "${repo_api}/git/refs/heads/${HEAL_BRANCH}" -f sha="$commit_sha" -F force=false --jq .object.sha > /dev/null

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
