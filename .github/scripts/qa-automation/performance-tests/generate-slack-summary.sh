#!/bin/bash
# Slack text for one TestMu performance run.
#
# Failures: one line per failed test (name, error or failure category, TestMu
# recording) and a link to the run. No failures: one line saying they passed.
#
# The text is printed JSON-escaped (quotes and newlines as \n) because the
# workflow drops it inside a JSON "text" field.
# Usage: ./generate-slack-summary.sh [summary.json]

SUMMARY_FILE="${1:-aggregated-reports/summary.json}"

if [ ! -f "$SUMMARY_FILE" ]; then
  printf '%s' '⚠️ Performance E2E: no test results available'
  exit 0
fi

RUN_URL=""
if [ -n "${GITHUB_SERVER_URL:-}" ] && [ -n "${GITHUB_REPOSITORY:-}" ] && [ -n "${GITHUB_RUN_ID:-}" ]; then
  RUN_URL="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
fi

TEXT=$(jq -r --arg runUrl "$RUN_URL" '
  def reason:
    if ((.failureMessage // "") | length) > 0 then .failureMessage
    else (.failureReason // "unknown")
    end;
  def recording:
    if ((.recordingLink // "") | length) > 0 then " — <\(.recordingLink)|TestMu>"
    else ""
    end;
  (.uniqueTests // .totalTests // 0) as $total |
  ([.failedTestsStats.failedTestsByTeam // {} | .[] | .tests[]?]
    | sort_by(.testName, .platform)) as $failed |
  if ($failed | length) == 0 then
    ":white_check_mark: Performance E2E: all \($total) tests passed"
  else
    "*Performance E2E: \($failed | length) of \($total) tests failed*\n"
    + ($failed | map("• *\(.testName)* — \(reason)\(recording)") | join("\n"))
  end
  + (if $runUrl == "" then "" else "\n\n<\($runUrl)|View full results>" end)
' "$SUMMARY_FILE")

printf '%s' "$TEXT" | jq -Rs '.' | sed 's/^"//; s/"$//'
