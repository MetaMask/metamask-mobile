#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  check-ab-testing-compliance.sh --staged
  check-ab-testing-compliance.sh --files <file1,file2,...>

Checks changed files for A/B testing implementation compliance.

Rules:
  - Fail: New business-event payloads under ab_tests
  - Fail: Malformed literal active_ab_tests objects missing key/value
  - Fail: Inline useABTest variants object missing control
  - Warn: Flag key naming mismatch for Abtest keys
  - Warn: A/B implementation files changed without test-file changes
EOF
}

MODE=""
FILES_ARG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --staged)
      MODE="staged"
      shift
      ;;
    --files)
      MODE="files"
      FILES_ARG="${2:-}"
      if [[ -z "$FILES_ARG" ]]; then
        echo "ERROR: --files requires a comma-separated value."
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

if [[ -z "$MODE" ]]; then
  echo "ERROR: Choose exactly one mode: --staged or --files."
  usage
  exit 2
fi

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

is_code_file() {
  local file="$1"
  [[ "$file" =~ \.(ts|tsx|js|jsx)$ ]]
}

is_test_file() {
  local file="$1"
  [[ "$file" =~ \.test\.(ts|tsx|js|jsx)$ ]] || [[ "$file" =~ /__tests__/ ]]
}

is_valid_flag_key() {
  local key="$1"
  [[ "$key" =~ ^[a-z][A-Za-z0-9]*[A-Z]{2,}[0-9]+Abtest[A-Z][A-Za-z0-9]*$ ]]
}

collect_files() {
  local files=()
  if [[ "$MODE" == "staged" ]]; then
    while IFS= read -r item; do
      [[ -n "$item" ]] && files+=("$item")
    done < <(git diff --cached --name-only --diff-filter=ACMR)
  else
    local raw
    IFS=',' read -r -a raw <<< "$FILES_ARG"
    local item
    for item in "${raw[@]}"; do
      item="$(trim "$item")"
      if [[ -n "$item" ]]; then
        files+=("$item")
      fi
    done
  fi
  if [[ ${#files[@]} -gt 0 ]]; then
    printf '%s\n' "${files[@]}"
  fi
}

get_added_lines() {
  local file="$1"
  if [[ "$MODE" == "staged" ]]; then
    git diff --cached --unified=0 -- "$file" \
      | grep '^+' \
      | grep -v '^+++' \
      | sed 's/^+//' || true
    return
  fi

  if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
    git diff --unified=0 HEAD -- "$file" \
      | grep '^+' \
      | grep -v '^+++' \
      | sed 's/^+//' || true
  elif [[ -f "$file" ]]; then
    cat "$file"
  fi
}

FAILURES=()
WARNINGS=()
AB_IMPL_FILES=()
TEST_CHANGED=0

CHANGED_FILES=()
while IFS= read -r file; do
  [[ -n "$file" ]] && CHANGED_FILES+=("$file")
done < <(collect_files)

if [[ ${#CHANGED_FILES[@]} -eq 0 || ( ${#CHANGED_FILES[@]} -eq 1 && -z "${CHANGED_FILES[0]}" ) ]]; then
  echo "A/B compliance check: no files to inspect."
  exit 0
fi

for file in "${CHANGED_FILES[@]}"; do
  [[ -z "$file" ]] && continue

  if is_test_file "$file"; then
    TEST_CHANGED=1
  fi

  added="$(get_added_lines "$file")"
  [[ -z "$added" ]] && continue
  if ! is_code_file "$file"; then
    continue
  fi

  if grep -Eq 'useABTest\(|active_ab_tests|Abtest|abTestConfig' <<< "$added"; then
    AB_IMPL_FILES+=("$file")
  fi

  # Rule: no new business-event ab_tests payloads.
  while IFS= read -r line; do
    if [[ "$line" =~ active_ab_tests[[:space:]]*: ]]; then
      continue
    fi
    if [[ "$line" =~ (^|[^A-Za-z0-9_])ab_tests[[:space:]]*: ]] && [[ ! "$line" =~ LEGACY_AB_TEST_ALLOWED ]]; then
      FAILURES+=("$file: added 'ab_tests' payload. Use 'active_ab_tests'.")
    fi
  done <<< "$added"

  added_lines=()
  while IFS= read -r added_line; do
    added_lines+=("$added_line")
  done <<< "$added"
  added_count="${#added_lines[@]}"

  for ((i=0; i<added_count; i++)); do
    line="${added_lines[$i]}"

    # Rule: validate literal active_ab_tests payloads include both key and value.
    if [[ "$line" =~ active_ab_tests[[:space:]]*: ]]; then
      if [[ "$line" =~ active_ab_tests[[:space:]]*:[[:space:]]*(\[|\{) ]]; then
        window="$line"
        for ((j=i+1; j<added_count && j<=i+8; j++)); do
          window+=$'\n'"${added_lines[$j]}"
        done
        if ! grep -Eq 'key[[:space:]]*:' <<< "$window" || ! grep -Eq 'value[[:space:]]*:' <<< "$window"; then
          FAILURES+=("$file: malformed literal active_ab_tests object (expected key and value).")
        fi
      fi
    fi

    # Rule: inline useABTest variants object must include control.
    # Only apply when the second argument is an inline object literal:
    # useABTest(flagKey, { ... })
    # Do not apply when variants are passed by reference:
    # useABTest(flagKey, VARIANTS)
    if [[ "$line" =~ useABTest[[:space:]]*\( ]]; then
      window="$line"
      for ((j=i+1; j<added_count && j<=i+20; j++)); do
        window+=$'\n'"${added_lines[$j]}"
      done
      normalized_window="$(printf '%s' "$window" | tr '\n' ' ')"
      if grep -Eq 'useABTest[[:space:]]*\([^,]+,[[:space:]]*\{' <<< "$normalized_window"; then
        if ! grep -Eq 'control[[:space:]]*:' <<< "$window"; then
          FAILURES+=("$file: inline useABTest variants object is missing control.")
        fi
      fi
    fi

    # Rule: warn on useABTest literal flag keys that do not follow naming convention.
    key="$(sed -nE "s/.*useABTest[[:space:]]*\\([[:space:]]*['\"]([^'\"]+)['\"].*/\\1/p" <<< "$line")"
    if [[ -n "$key" ]]; then
      if ! is_valid_flag_key "$key"; then
        WARNINGS+=("$file: flag key '$key' does not match {team}{TICKET}Abtest{Name}.")
      fi
    fi

    # Rule: warn for any explicit Abtest keys that do not match naming convention.
    while IFS= read -r quoted; do
      [[ -z "$quoted" ]] && continue
      key="${quoted:1:${#quoted}-2}"
      if ! is_valid_flag_key "$key"; then
        WARNINGS+=("$file: Abtest key '$key' does not match {team}{TICKET}Abtest{Name}.")
      fi
    done < <(grep -oE "['\"][^'\"]*Abtest[^'\"]*['\"]" <<< "$line" || true)
  done
done

if [[ ${#AB_IMPL_FILES[@]} -gt 0 && "$TEST_CHANGED" -eq 0 ]]; then
  WARNINGS+=("A/B implementation files changed without any test-file updates.")
fi

echo "A/B compliance check summary"
echo "Mode: $MODE"
echo "Files inspected: ${#CHANGED_FILES[@]}"

if [[ ${#FAILURES[@]} -gt 0 ]]; then
  echo ""
  echo "Failures:"
  printf '%s\n' "${FAILURES[@]}" | awk '!seen[$0]++' | sed 's/^/- /'
fi

if [[ ${#WARNINGS[@]} -gt 0 ]]; then
  echo ""
  echo "Warnings:"
  printf '%s\n' "${WARNINGS[@]}" | awk '!seen[$0]++' | sed 's/^/- /'
fi

if [[ ${#FAILURES[@]} -gt 0 ]]; then
  exit 1
fi

exit 0
