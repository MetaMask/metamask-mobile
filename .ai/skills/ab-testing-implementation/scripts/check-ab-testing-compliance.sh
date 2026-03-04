#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  check-ab-testing-compliance.sh --staged
  check-ab-testing-compliance.sh --files <file1,file2,...> [--base <git-ref>]

Checks changed files for A/B testing implementation compliance.

Rules:
  - Fail: New ab_tests payload additions in checked code diffs
  - Fail: Malformed literal active_ab_tests objects missing key/value
  - Fail: Inline useABTest variants object missing control
  - Warn: Flag key naming mismatch for Abtest keys
  - Warn: Risky A/B integration changes without test-file updates
EOF
}

MODE=""
FILES_ARG=""
BASE_REF=""
FALLBACK_TO_WORKTREE=0
FALLBACK_NOTE=""

set_mode() {
  local new_mode="$1"
  if [[ -n "$MODE" ]]; then
    echo "ERROR: Choose exactly one mode: --staged or --files."
    usage
    exit 2
  fi
  MODE="$new_mode"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --staged)
      set_mode "staged"
      shift
      ;;
    --files)
      set_mode "files"
      FILES_ARG="${2:-}"
      if [[ -z "$FILES_ARG" ]]; then
        echo "ERROR: --files requires a comma-separated value."
        exit 2
      fi
      shift 2
      ;;
    --base)
      BASE_REF="${2:-}"
      if [[ -z "$BASE_REF" ]]; then
        echo "ERROR: --base requires a git ref (for example origin/main)."
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

resolve_default_base_ref() {
  if [[ "$MODE" != "files" || -n "$BASE_REF" ]]; then
    return
  fi

  local candidate
  for candidate in "origin/main" "main" "HEAD~1"; do
    if git rev-parse --verify "$candidate" >/dev/null 2>&1; then
      BASE_REF="$candidate"
      return
    fi
  done
}

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

collect_staged_files() {
  git diff --cached --name-only --diff-filter=ACMR | awk 'NF && !seen[$0]++'
}

collect_worktree_files() {
  {
    git diff --name-only --diff-filter=ACMR
    git ls-files --others --exclude-standard
  } | awk 'NF && !seen[$0]++'
}

collect_explicit_files() {
  local raw
  local item

  IFS=',' read -r -a raw <<< "$FILES_ARG"
  for item in "${raw[@]}"; do
    item="$(trim "$item")"
    [[ -n "$item" ]] && printf '%s\n' "$item"
  done | awk 'NF && !seen[$0]++'
}

get_added_lines() {
  local file="$1"
  local base_ref="${2:-}"

  if [[ "$MODE" == "staged" ]]; then
    if [[ "$FALLBACK_TO_WORKTREE" -eq 1 ]]; then
      # For fallback mode, treat untracked files as fully added.
      if [[ -f "$file" ]] && ! git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
        cat "$file"
        return
      fi

      git diff --unified=0 -- "$file" \
        | grep '^+' \
        | grep -v '^+++' \
        | sed 's/^+//' || true
      return
    fi

    git diff --cached --unified=0 -- "$file" \
      | grep '^+' \
      | grep -v '^+++' \
      | sed 's/^+//' || true
    return
  fi

  # For explicit files mode, new/untracked files are all "added".
  if [[ -f "$file" ]] && ! git cat-file -e "HEAD:$file" >/dev/null 2>&1; then
    cat "$file"
    return
  fi

  # Long-term branch-safe behavior: compare against base ref in clean checkouts.
  if [[ -n "$base_ref" ]] && git rev-parse --verify "$base_ref" >/dev/null 2>&1; then
    git diff --unified=0 "$base_ref"...HEAD -- "$file" \
      | grep '^+' \
      | grep -v '^+++' \
      | sed 's/^+//' || true
    return
  fi

  # Fallback for local, uncommitted edits.
  if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
    git diff --unified=0 HEAD -- "$file" \
      | grep '^+' \
      | grep -v '^+++' \
      | sed 's/^+//' || true
  fi
}

get_scan_content() {
  local file="$1"

  if [[ "$MODE" == "staged" ]]; then
    if [[ "$FALLBACK_TO_WORKTREE" -eq 1 ]]; then
      if [[ -f "$file" ]]; then
        cat "$file"
      fi
      return
    fi

    if git cat-file -e ":$file" >/dev/null 2>&1; then
      git show ":$file"
    fi
    return
  fi

  if [[ -f "$file" ]]; then
    cat "$file"
    return
  fi

  if git cat-file -e "HEAD:$file" >/dev/null 2>&1; then
    git show "HEAD:$file"
  fi
}

get_changed_line_numbers() {
  local file="$1"
  local base_ref="${2:-}"
  local diff_cmd_output=""

  # For untracked/new files in working tree or fallback mode, all lines are changed.
  if [[ -f "$file" ]] && ! git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
    awk '{ print NR }' "$file"
    return
  fi

  if [[ "$MODE" == "staged" ]]; then
    if [[ "$FALLBACK_TO_WORKTREE" -eq 1 ]]; then
      diff_cmd_output="$(git diff --unified=0 -- "$file" || true)"
    else
      diff_cmd_output="$(git diff --cached --unified=0 -- "$file" || true)"
    fi
  else
    if [[ -n "$base_ref" ]] && git rev-parse --verify "$base_ref" >/dev/null 2>&1; then
      diff_cmd_output="$(git diff --unified=0 "$base_ref"...HEAD -- "$file" || true)"
    else
      diff_cmd_output="$(git diff --unified=0 HEAD -- "$file" || true)"
    fi
  fi

  awk '
    /^@@ / {
      if (match($0, /\+[0-9]+(,[0-9]+)?/)) {
        chunk = substr($0, RSTART + 1, RLENGTH - 1);
        comma_pos = index(chunk, ",");
        if (comma_pos > 0) {
          start = substr(chunk, 1, comma_pos - 1) + 0;
          count = substr(chunk, comma_pos + 1) + 0;
        } else {
          start = chunk + 0;
          count = 1;
        }

        if (count == 0) {
          print start;
        } else {
          for (i = 0; i < count; i++) {
            print start + i;
          }
        }
      }
    }
  ' <<< "$diff_cmd_output" | awk 'NF && !seen[$0]++'
}

line_is_changed() {
  local line_no="$1"
  local changed_lines="$2"
  [[ -n "$changed_lines" ]] && grep -Fxq "$line_no" <<< "$changed_lines"
}

count_char() {
  local text="$1"
  local char="$2"
  awk -v text="$text" -v char="$char" 'BEGIN {
    count = 0;
    for (i = 1; i <= length(text); i++) {
      if (substr(text, i, 1) == char) {
        count++;
      }
    }
    print count;
  }'
}

window_has_changed_line() {
  local start_line="$1"
  local end_line="$2"
  local changed_lines="$3"
  local ln

  if [[ -z "$changed_lines" ]]; then
    return 1
  fi

  for ((ln=start_line; ln<=end_line; ln++)); do
    if line_is_changed "$ln" "$changed_lines"; then
      return 0
    fi
  done

  return 1
}

FAILURES=()
WARNINGS=()
AB_RISKY_CHANGE_FILES=()
TEST_CHANGED=0

CHANGED_FILES=()
if [[ "$MODE" == "staged" ]]; then
  while IFS= read -r file; do
    [[ -n "$file" ]] && CHANGED_FILES+=("$file")
  done < <(collect_staged_files)

  if [[ ${#CHANGED_FILES[@]} -eq 0 ]]; then
    FALLBACK_TO_WORKTREE=1
    FALLBACK_NOTE="Info: no staged files found; falling back to working-tree changed files."
    while IFS= read -r file; do
      [[ -n "$file" ]] && CHANGED_FILES+=("$file")
    done < <(collect_worktree_files)
  fi
else
  while IFS= read -r file; do
    [[ -n "$file" ]] && CHANGED_FILES+=("$file")
  done < <(collect_explicit_files)
fi

resolve_default_base_ref

if [[ ${#CHANGED_FILES[@]} -eq 0 || ( ${#CHANGED_FILES[@]} -eq 1 && -z "${CHANGED_FILES[0]}" ) ]]; then
  if [[ "$MODE" == "staged" ]]; then
    echo "A/B compliance check: no staged files and no working-tree changed files to inspect."
  else
    echo "A/B compliance check: no files to inspect from --files input."
  fi
  exit 0
fi

for file in "${CHANGED_FILES[@]}"; do
  [[ -z "$file" ]] && continue

  if is_test_file "$file"; then
    TEST_CHANGED=1
  fi

  if ! is_code_file "$file"; then
    continue
  fi

  added="$(get_added_lines "$file" "$BASE_REF")"
  scan_content="$(get_scan_content "$file")"
  changed_line_numbers="$(get_changed_line_numbers "$file" "$BASE_REF")"
  [[ -z "$scan_content" ]] && continue

  if grep -Eq 'useABTest\(|active_ab_tests[[:space:]]*:|ab_tests[[:space:]]*:|trackEvent\(|createEventBuilder\(|MetaMetricsEvents\.|EXPERIMENT_VIEWED|Experiment Viewed' <<< "$added"; then
    AB_RISKY_CHANGE_FILES+=("$file")
  fi

  # Rule: no new ab_tests payload additions in checked code diffs.
  while IFS= read -r line; do
    if [[ "$line" =~ active_ab_tests[[:space:]]*: ]]; then
      continue
    fi
    if [[ "$line" =~ (^|[^A-Za-z0-9_])ab_tests[[:space:]]*: ]] && [[ ! "$line" =~ LEGACY_AB_TEST_ALLOWED ]]; then
      FAILURES+=("$file: added 'ab_tests' payload. New ab_tests payloads are forbidden.")
    fi
  done <<< "$added"

  scan_lines=()
  while IFS= read -r scan_line; do
    scan_lines+=("$scan_line")
  done <<< "$scan_content"
  scan_count="${#scan_lines[@]}"

  for ((i=0; i<scan_count; i++)); do
    line="${scan_lines[$i]}"
    line_no=$((i + 1))

    # Rule: validate literal active_ab_tests payloads include both key and value.
    if [[ "$line" =~ active_ab_tests[[:space:]]*: ]]; then
      if [[ "$line" =~ active_ab_tests[[:space:]]*:[[:space:]]*(\[|\{) ]]; then
        open_bracket="${BASH_REMATCH[1]}"
        close_bracket="]"
        if [[ "$open_bracket" == "{" ]]; then
          close_bracket="}"
        fi

        payload_end=$i
        bracket_depth=0
        found_literal_start=0
        for ((j=i; j<scan_count; j++)); do
          segment="${scan_lines[$j]}"
          if (( j == i )); then
            segment_after_literal="${segment#*${open_bracket}}"
            if [[ "$segment_after_literal" != "$segment" ]]; then
              found_literal_start=1
              open_count=$((1 + $(count_char "$segment_after_literal" "$open_bracket")))
              close_count="$(count_char "$segment_after_literal" "$close_bracket")"
            else
              open_count=0
              close_count=0
            fi
          else
            open_count="$(count_char "$segment" "$open_bracket")"
            close_count="$(count_char "$segment" "$close_bracket")"
          fi

          if (( found_literal_start == 1 )); then
            bracket_depth=$((bracket_depth + open_count - close_count))
            payload_end=$j
            if (( bracket_depth <= 0 )); then
              break
            fi
          fi
        done

        # Run this structural check only when changed lines intersect this payload literal block.
        if ! window_has_changed_line "$line_no" "$((payload_end + 1))" "$changed_line_numbers"; then
          continue
        fi

        window="$line"
        for ((j=i+1; j<scan_count && j<=payload_end; j++)); do
          window+=$'\n'"${scan_lines[$j]}"
        done
        if ! grep -Eq 'key[[:space:]]*:' <<< "$window" || ! grep -Eq 'value[[:space:]]*:' <<< "$window"; then
          FAILURES+=("$file: malformed literal active_ab_tests object (expected key and value).")
        fi
      fi
    fi

    # Rule: inline useABTest variants object must include control.
    # Only apply when the second argument is an inline object literal.
    if [[ "$line" =~ useABTest[[:space:]]*\( ]]; then
      call_window=""
      paren_depth=0
      call_end_index=$i
      for ((j=i; j<scan_count; j++)); do
        segment="${scan_lines[$j]}"
        if (( j == i )); then
          segment="useABTest${segment#*useABTest}"
        fi

        call_window+="${call_window:+$'\n'}${segment}"

        open_count="$(printf '%s' "$segment" | tr -cd '(' | wc -c | tr -d ' ')"
        close_count="$(printf '%s' "$segment" | tr -cd ')' | wc -c | tr -d ' ')"
        paren_depth=$((paren_depth + open_count - close_count))
        call_end_index=$j

        if (( paren_depth <= 0 )); then
          break
        fi
      done

      # Run this structural check only when changed lines intersect the useABTest call window.
      if ! window_has_changed_line "$line_no" "$((call_end_index + 1))" "$changed_line_numbers"; then
        continue
      fi

      normalized_call="$(printf '%s' "$call_window" | tr '\n' ' ')"
      if grep -Eq 'useABTest[[:space:]]*\([^,]+,[[:space:]]*\{' <<< "$normalized_call"; then
        if ! grep -Eq 'control[[:space:]]*:' <<< "$call_window"; then
          FAILURES+=("$file: inline useABTest variants object is missing control.")
        fi
      fi
    fi

    # Rule: warn on useABTest literal flag keys that do not follow naming convention.
    use_abtest_literal_key="$(sed -nE "s/.*useABTest[[:space:]]*\\([[:space:]]*['\"]([^'\"]+)['\"].*/\\1/p" <<< "$line")"
    if [[ -n "$use_abtest_literal_key" ]]; then
      if ! is_valid_flag_key "$use_abtest_literal_key"; then
        WARNINGS+=("$file: flag key '$use_abtest_literal_key' does not match {team}{TICKET}Abtest{Name}.")
      fi
    fi

    # Rule: warn for any explicit Abtest keys that do not match naming convention.
    while IFS= read -r quoted; do
      [[ -z "$quoted" ]] && continue
      key="${quoted:1:${#quoted}-2}"
      if [[ -n "$use_abtest_literal_key" && "$key" == "$use_abtest_literal_key" ]]; then
        continue
      fi
      if ! is_valid_flag_key "$key"; then
        WARNINGS+=("$file: Abtest key '$key' does not match {team}{TICKET}Abtest{Name}.")
      fi
    done < <(grep -oE "['\"][^'\"]*Abtest[^'\"]*['\"]" <<< "$line" || true)
  done
done

if [[ ${#AB_RISKY_CHANGE_FILES[@]} -gt 0 && "$TEST_CHANGED" -eq 0 ]]; then
  WARNINGS+=("Risky A/B integration changes were detected without any test-file updates. For copy/config-only changes, document rationale in your response.")
fi

echo "A/B compliance check summary"
echo "Mode: $MODE"
if [[ -n "$FALLBACK_NOTE" ]]; then
  echo "$FALLBACK_NOTE"
fi
if [[ "$MODE" == "files" && -n "$BASE_REF" ]]; then
  echo "Base ref: $BASE_REF"
fi
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
