#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  check-no-code-fences.sh [--path <dir>]

Fails if any `///: BEGIN:ONLY_INCLUDE_IF(...)` / `///: END:ONLY_INCLUDE_IF`
code-fence marker is found under the given path (defaults to the repo root).

Code fencing (the @metamask/build-utils Metro transform that stripped these
comment markers at build time) has been removed from this codebase in favor
of runtime feature gating (see app/util/environment.ts for flask/beta, and
an inlined env check + lazy `require()` for opt-in features, e.g.
INCLUDE_SAMPLE_FEATURE and MM_PERPS_LIGHTER_PROVIDER_ENABLED). Do not
reintroduce fence markers — gate the feature at runtime instead.
USAGE
}

SEARCH_PATH="."

while [[ $# -gt 0 ]]; do
  case "$1" in
    --path)
      SEARCH_PATH="${2:-}"
      if [[ -z "$SEARCH_PATH" ]]; then
        echo "ERROR: --path requires a directory."
        exit 2
      fi
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: Unknown argument: $1"
      usage
      exit 2
      ;;
  esac
done

cd "$SEARCH_PATH"

# Tolerates the historical marker variants seen in this codebase (missing
# colon after `///`, and `END:ONLY_INCLUDE_IF(...)` with trailing params).
PATTERN='///:?[[:space:]]*(BEGIN|END):ONLY_INCLUDE_IF'

# Fail loudly (rather than silently reporting "OK") if $SEARCH_PATH isn't a
# git work tree.
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "ERROR: '$SEARCH_PATH' is not inside a git repository."
  exit 1
fi

# `git grep` only scans tracked files, so generated/ignored artifacts (coverage
# reports, node_modules, build output, etc.) never trip this check, and it
# skips submodules (e.g. ios/branch-ios-sdk) and tracked files missing from the
# work tree. It exits 0 on a match, 1 on no match, and >1 on error.
#
# Exclude this script and its own test file, which intentionally contains
# fence-marker strings as test fixtures (see tests/scripts/check-no-code-fences.test.ts).
set +e
matches=$(git grep -lIE "$PATTERN" -- . \
  ':!:scripts/check-no-code-fences.sh' \
  ':!:tests/scripts/check-no-code-fences.test.ts')
grep_status=$?
set -e

if [[ $grep_status -gt 1 ]]; then
  echo "ERROR: git grep failed (exit $grep_status) while scanning for code-fence markers."
  exit 1
fi

if [[ -n "$matches" ]]; then
  echo "ERROR: Found code-fence marker(s). Code fencing has been removed from"
  echo "this codebase — gate the feature at runtime instead (see"
  echo "app/util/environment.ts and app/features/SampleFeature/README.md)."
  echo
  echo "$matches"
  exit 1
fi

echo "OK: no code-fence markers found."
