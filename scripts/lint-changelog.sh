#!/usr/bin/env bash

set -euo pipefail

# Validates CHANGELOG.md with @metamask/auto-changelog, mirroring the pattern used
# by metamask-extension (see .github/workflows/repository-health-checks.yml there).
#
# On release-oriented branches, `--rc` is added so validation also enforces that the
# branch's current package.json version has a corresponding changelog section. This
# is what should have caught the malformed '### **Before**' header that broke the
# 8.3.0 -> 8.4.0 release-cut automation before it ever reached CI.
#
# Branch shapes treated as release-oriented:
#   release/X.Y.Z, release/X.Y.Z-ota   (release branches, incl. OTA hotfixes)
#   release-changelog/X.Y.Z[...]       (the changelog-generation working branch)
#
# package.json has no "repository" field, so --repo is passed explicitly.

readonly REPO_URL='https://github.com/MetaMask/metamask-mobile'

branch="${GITHUB_HEAD_REF:-}"
if [[ -z "$branch" ]]; then
  branch="${GITHUB_REF_NAME:-}"
fi
if [[ -z "$branch" ]]; then
  branch="$(git branch --show-current 2>/dev/null || true)"
fi

rc_flag=()
if [[ "$branch" =~ ^release/[0-9]+\.[0-9]+\.[0-9]+(-ota)?$ ]] || [[ "$branch" =~ ^release-changelog/[0-9]+\.[0-9]+\.[0-9]+ ]]; then
  echo "Branch '${branch}' is release-oriented: validating with --rc"
  rc_flag=(--rc)
else
  echo "Branch '${branch}' is not release-oriented: validating without --rc"
fi

yarn auto-changelog validate --repo "$REPO_URL" "${rc_flag[@]+"${rc_flag[@]}"}"
