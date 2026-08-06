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
INCLUDE_SAMPLE_FEATURE + lazy `require()` for dev-only features). Do not
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

# Only scan git-tracked files so generated/ignored artifacts (coverage
# reports, node_modules, build output, etc.) never trip this check.
FILE_LIST="$(mktemp)"
GREP_STDERR="$(mktemp)"
trap 'rm -f "$FILE_LIST" "$GREP_STDERR"' EXIT

# Exclude this script and its own test file, which intentionally contains
# fence-marker strings as test fixtures (see tests/scripts/check-no-code-fences.test.ts).
#
# Fail loudly (rather than silently reporting "OK") if `git ls-files` itself
# can't run, e.g. because $SEARCH_PATH isn't a git repo.
if ! git ls-files -z -- \
  ':!:scripts/check-no-code-fences.sh' \
  ':!:tests/scripts/check-no-code-fences.test.ts' \
  > "$FILE_LIST"; then
  echo "ERROR: 'git ls-files' failed — is '$SEARCH_PATH' a git repository?"
  exit 1
fi

# `grep` exits 1 for a batch with no matches, which is the expected "all clear"
# case here, and GNU xargs reports that as 123 while BSD xargs may report 1.
# Since neither status distinguishes "no matches" from a real failure portably,
# detect real failures from grep's stderr instead of its exit status.
set +e
matches=$(xargs -0 grep -lIE "$PATTERN" < "$FILE_LIST" 2>"$GREP_STDERR")
set -e

if [[ -s "$GREP_STDERR" ]]; then
  echo "ERROR: grep failed while scanning for code-fence markers."
  cat "$GREP_STDERR"
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
