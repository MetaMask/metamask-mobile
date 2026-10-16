#!/usr/bin/env bash
# Pull requests skip the merged unit/CV lcov, so Sonar records 0% on new lines.
# Cover just the changed source with the unit tests that sit next to it, and
# write coverage/lcov.info where the scan reads it.
set -euo pipefail

if [[ -f coverage/lcov.info ]]; then
  echo "coverage/lcov.info already present"
  exit 0
fi

if [[ ! -d node_modules ]]; then
  echo "node_modules missing; skipping pull request coverage"
  exit 0
fi

if [[ -z "${BASE_SHA:-}" ]]; then
  echo "No pull request base sha; skipping pull request coverage"
  exit 0
fi

# The base tip may be newer than this branch's history.
if ! git cat-file -e "${BASE_SHA}^{commit}" 2>/dev/null; then
  if [[ -z "${BASE_REF:-}" ]] || ! git fetch --no-tags origin "$BASE_REF"; then
    echo "Could not fetch the pull request base; skipping coverage"
    exit 0
  fi
  BASE_SHA="origin/${BASE_REF}"
fi

mapfile -t sources < <(
  git diff --name-only --diff-filter=ACMR "$BASE_SHA" -- app |
    grep -E '\.(ts|tsx)$' |
    grep -Ev '\.(test|view\.test|integration\.test)\.' || true
)

source_count="${#sources[@]}"
if [[ "$source_count" -eq 0 || "$source_count" -gt 20 ]]; then
  echo "Skipping pull request coverage for ${source_count} source files"
  exit 0
fi

test_paths=()
add_test() {
  local path="$1"
  local existing
  [[ -f "$path" ]] || return 0
  if [[ ${#test_paths[@]} -gt 0 ]]; then
    for existing in "${test_paths[@]}"; do
      [[ "$existing" == "$path" ]] && return 0
    done
  fi
  test_paths+=("$path")
}

while IFS= read -r changed_test; do
  [[ -z "$changed_test" ]] && continue
  case "$changed_test" in
    *.integration.test.* | *.view.test.*) continue ;;
  esac
  add_test "$changed_test"
done < <(
  git diff --name-only --diff-filter=ACMR "$BASE_SHA" -- app |
    grep -E '\.test\.(ts|tsx)$' || true
)

for src in "${sources[@]}"; do
  dir="$(dirname "$src")"
  base="$(basename "$src")"
  base="${base%.tsx}"
  base="${base%.ts}"
  base="${base%.jsx}"
  base="${base%.js}"
  add_test "$dir/$base.test.ts"
  add_test "$dir/$base.test.tsx"
done

if [[ ${#test_paths[@]} -eq 0 ]]; then
  echo "No sibling unit tests for the changed source"
  exit 0
fi

collect_args=()
for src in "${sources[@]}"; do
  collect_args+=(--collectCoverageFrom="$src")
done

echo "Covering ${source_count} source files with ${#test_paths[@]} unit tests"
printf '  %s\n' "${test_paths[@]}"

yarn jest \
  --coverage \
  --coverageReporters=lcov \
  --coverageReporters=text-summary \
  --coverageDirectory=coverage \
  --watchman=false \
  --forceExit \
  "${collect_args[@]}" \
  "${test_paths[@]}"
