#!/bin/bash
# Slack text for one TestMu performance run.
#
# The message body is generate-slack-summary.mjs (same failure wording as the
# PR comment). This prints it JSON-escaped, because the workflow drops it
# inside a JSON "text" field.
# Usage: ./generate-slack-summary.sh [summary.json]

DIR="$(cd "$(dirname "$0")" && pwd)"
TEXT="$(node "$DIR/generate-slack-summary.mjs" "$@")"
printf '%s' "$TEXT" | jq -Rs '.' | sed 's/^"//; s/"$//'
