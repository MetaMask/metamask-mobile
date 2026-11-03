#!/usr/bin/env bash
# Resolves mode and safety flags for release-slack-summaries.yml.
# Writes mode, dry-run, allow-pr-write, test-channel, blocker-jql, and
# regression-jql to $GITHUB_OUTPUT. Does not call Slack, Jira, or GitHub.

set -euo pipefail

# Concurrency suffix for the workflow group expression. A non-empty schedule
# other than the 10:21 cron is the blocker run. Dispatch uses the mode input.
# Keep this in lockstep with `concurrency.group` in the workflow.
release_slack_summaries_concurrency_suffix() {
  local schedule="${1-}"
  local dispatch_mode="${2-}"
  if [[ "$schedule" == "21 10 * * 1-5" ]]; then
    printf '%s\n' "release-validation"
  elif [[ -n "$schedule" ]]; then
    printf '%s\n' "blocker-summary"
  else
    printf '%s\n' "$dispatch_mode"
  fi
}

# Preview text for dry runs and non-live runs when the repository variables
# are unset. These are not the MCRM-155 queries. A live post never uses them.
PREVIEW_BLOCKER_JQL='type = Bug AND labels = "release-blocker" AND statusCategory != Done'
PREVIEW_REGRESSION_JQL='type = Bug AND statusCategory != Done'

# Drop characters JavaScript trim() removes and Python isspace() does not,
# then drop every Unicode space. Used for Slack channels.
normalize_channel() {
  printf '%s' "$1" | python3 -c 'import sys
drop = set("\ufeff\u200b\u2060\u180e")
sys.stdout.write("".join(ch for ch in sys.stdin.read() if ch not in drop and not ch.isspace()))'
}

# Same invisible characters, then trim ends only. Internal spaces stay so the
# JQL text is preserved. Emptiness uses this result.
clean_jql() {
  printf '%s' "$1" | python3 -c 'import sys
drop = set("\ufeff\u200b\u2060\u180e")
text = "".join(ch for ch in sys.stdin.read() if ch not in drop)
sys.stdout.write(text.strip())'
}

fail() {
  echo "::error::$1"
  echo "$1" >&2
  exit 1
}

main() {
  local event_name="${EVENT_NAME:-}"
  local schedule="${SCHEDULE:-}"
  local input_mode="${INPUT_MODE:-}"
  local input_dry_run="${INPUT_DRY_RUN:-}"
  local input_test_channel="${INPUT_TEST_CHANNEL-}"
  local ga_mode="${GA_MODE:-}"
  local test_channel_var="${TEST_CHANNEL_VAR-}"
  # Repository variables. Empty unless the owner set them. Not built-in queries.
  local raw_blocker="${RELEASE_SUMMARY_BLOCKER_JQL-}"
  local raw_regression="${RELEASE_SUMMARY_REGRESSION_JQL-}"

  local mode
  if [[ "$event_name" == "workflow_dispatch" ]]; then
    mode="$input_mode"
  elif [[ "$schedule" == "16 10 * * 1-5" ]]; then
    mode="blocker-summary"
  elif [[ "$schedule" == "21 10 * * 1-5" ]]; then
    mode="release-validation"
  else
    fail "Refusing to run: event=${event_name} schedule=${schedule:-<none>} is not a known trigger"
  fi

  case "$mode" in
    blocker-summary|release-validation) ;;
    *)
      fail "Refusing to run: unsupported mode=${mode}"
      ;;
  esac

  # Exact match only. Unset, "test", and any other value stay off real channels.
  local live="false"
  if [[ "$ga_mode" == "live" ]]; then
    live="true"
  fi

  # Choose the raw channel before any emptiness check. Dispatch wins when the
  # caller typed something. Otherwise a non-live run uses the repository variable.
  local raw_test_channel=""
  local supplied="false"
  if [[ "$event_name" == "workflow_dispatch" && -n "$input_test_channel" ]]; then
    raw_test_channel="$input_test_channel"
    supplied="true"
  elif [[ "$live" == "false" && -n "$test_channel_var" ]]; then
    raw_test_channel="$test_channel_var"
    supplied="true"
  fi

  # Keep the newline refusal on the raw value. Stripping first would hide it.
  if [[ "$raw_test_channel" == *$'\n'* || "$raw_test_channel" == *$'\r'* ]]; then
    fail "Refusing test-channel that contains a newline"
  fi

  local test_channel validated_test_channel_var
  test_channel="$(normalize_channel "$raw_test_channel")"
  validated_test_channel_var="$(normalize_channel "$test_channel_var")"

  if [[ "$supplied" == "true" && -z "$test_channel" ]]; then
    fail "Test channel is only whitespace and would fall back to the real release channel"
  fi

  if [[ -n "$test_channel" ]]; then
    if [[ ! "$test_channel" =~ ^#[a-z0-9][a-z0-9_-]{0,79}$ && ! "$test_channel" =~ ^[CG][A-Z0-9]+$ ]]; then
      fail "Test channel is not a Slack channel ID (C…/G…) or #name"
    fi
    local lowered="${test_channel,,}"
    if [[ "$live" == "false" && ( "$lowered" == \#release-* || "$lowered" == release-* ) ]]; then
      fail "Refusing release channel ${test_channel} while GA_MODE is not live"
    fi
    # A C…/G… id is not checked against release-* names. While GA_MODE is not
    # live, accept an id only when it is exactly the validated test-channel
    # variable. Any other id is rejected.
    if [[ "$live" == "false" && "$test_channel" =~ ^[CG][A-Z0-9]+$ && "$test_channel" != "$validated_test_channel_var" ]]; then
      fail "Refusing Slack channel ID ${test_channel} while GA_MODE is not live unless it equals RELEASE_SUMMARY_TEST_CHANNEL"
    fi
  fi

  # Dry-run is off only for the exact string "false" on workflow_dispatch.
  # A schedule ignores the input. Anything else, including empty, stays dry-run
  # for a manual run.
  local dry_run="false"
  if [[ "$event_name" == "workflow_dispatch" && "$input_dry_run" != "false" ]]; then
    dry_run="true"
  fi
  # Non-live with no channel must not fall through to the real release channels.
  if [[ "$live" == "false" && -z "$test_channel" ]]; then
    dry_run="true"
  fi

  # A test channel blocks the PR rewrite even when GA_MODE=live. Zap 597 still
  # rewrites the release PR body during the parallel run. github-tools#306
  # deviation 3 (test channel limits Slack only) is not followed here.
  local allow_pr_write="false"
  if [[ "$live" == "true" && "$mode" == "release-validation" && "$dry_run" == "false" && -z "$test_channel" ]]; then
    allow_pr_write="true"
  fi

  # A newline in either variable could append extra key=value lines to
  # $GITHUB_OUTPUT. Refuse it before anything is written.
  if [[ "$raw_blocker" == *$'\n'* || "$raw_blocker" == *$'\r'* || "$raw_regression" == *$'\n'* || "$raw_regression" == *$'\r'* ]]; then
    fail "Refusing JQL that contains a newline"
  fi

  local cleaned_blocker cleaned_regression blocker_jql regression_jql
  cleaned_blocker="$(clean_jql "$raw_blocker")"
  cleaned_regression="$(clean_jql "$raw_regression")"

  # Live posts that are not dry runs use only the repository variables.
  # Preview strings are not the MCRM-155 queries and are not used here.
  if [[ "$live" == "true" && "$dry_run" == "false" ]]; then
    if [[ -z "$cleaned_blocker" ]]; then
      fail "Refusing to post: GA_MODE=live requires RELEASE_SUMMARY_BLOCKER_JQL (jira-release-blocker-jql) to be set. Built-in queries are not used for a live post."
    fi
    if [[ -z "$cleaned_regression" ]]; then
      fail "Refusing to post: GA_MODE=live requires RELEASE_SUMMARY_REGRESSION_JQL (jira-regression-jql) to be set. Built-in queries are not used for a live post."
    fi
    blocker_jql="$cleaned_blocker"
    regression_jql="$cleaned_regression"
  else
    blocker_jql="$cleaned_blocker"
    regression_jql="$cleaned_regression"
    if [[ -z "$blocker_jql" ]]; then
      blocker_jql="$PREVIEW_BLOCKER_JQL"
    fi
    if [[ -z "$regression_jql" ]]; then
      regression_jql="$PREVIEW_REGRESSION_JQL"
    fi
  fi

  if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
    fail "GITHUB_OUTPUT is not set"
  fi

  # JQL lines first. mode, dry-run, allow-pr-write, and test-channel are
  # written after them so a crafted JQL line cannot be the last value.
  {
    echo "blocker-jql=${blocker_jql}"
    echo "regression-jql=${regression_jql}"
    echo "mode=${mode}"
    echo "dry-run=${dry_run}"
    echo "allow-pr-write=${allow_pr_write}"
    echo "test-channel=${test_channel}"
  } >> "$GITHUB_OUTPUT"

  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    {
      echo "### Release Slack summary caller"
      echo "- event: ${event_name}"
      echo "- schedule: ${schedule:-<none>}"
      echo "- mode: ${mode}"
      echo "- GA_MODE: ${ga_mode:-<unset>}"
      echo "- dry-run: ${dry_run}"
      echo "- allow-pr-write: ${allow_pr_write}"
      if [[ -n "$test_channel" ]]; then
        echo "- slack: test channel \`${test_channel}\` only"
      elif [[ "$dry_run" == "true" ]]; then
        echo "- slack: nothing will be posted"
      else
        echo "- slack: real release channels"
      fi
    } >> "$GITHUB_STEP_SUMMARY"
  fi

  echo "Resolved mode=${mode} live=${live} dry-run=${dry_run} allow-pr-write=${allow_pr_write} test-channel=${test_channel:-<unset>}"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
