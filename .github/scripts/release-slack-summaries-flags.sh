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

strip_all_whitespace() {
  printf '%s' "$1" | python3 -c 'import sys; sys.stdout.write("".join(ch for ch in sys.stdin.read() if not ch.isspace()))'
}

trim_ends() {
  printf '%s' "$1" | python3 -c 'import sys; sys.stdout.write(sys.stdin.read().strip())'
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
  local blocker_jql regression_jql
  blocker_jql="$(trim_ends "${BLOCKER_JQL-}")"
  regression_jql="$(trim_ends "${REGRESSION_JQL-}")"

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

  local test_channel
  test_channel="$(strip_all_whitespace "$raw_test_channel")"

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

  # Live posts need the ticket JQL. An empty blocker query makes the action
  # skip blockers and can publish "no remaining bugs" while labeled bugs are open.
  if [[ "$live" == "true" && "$dry_run" == "false" ]]; then
    if [[ -z "$(strip_all_whitespace "$blocker_jql")" ]]; then
      fail "Refusing to post: GA_MODE=live requires a non-empty jira-release-blocker-jql"
    fi
    if [[ -z "$(strip_all_whitespace "$regression_jql")" ]]; then
      fail "Refusing to post: GA_MODE=live requires a non-empty jira-regression-jql"
    fi
  fi

  if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
    fail "GITHUB_OUTPUT is not set"
  fi

  {
    echo "mode=${mode}"
    echo "dry-run=${dry_run}"
    echo "allow-pr-write=${allow_pr_write}"
    echo "test-channel=${test_channel}"
    echo "blocker-jql=${blocker_jql}"
    echo "regression-jql=${regression_jql}"
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
