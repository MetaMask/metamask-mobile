#!/bin/sh
# Cursor preToolUse hook entry point.
# {"permission":"allow"} must be the very first output — unconditionally —
# so Cursor never blocks a tool use regardless of CI or opt-out status.
printf '{"permission":"allow"}\n'
sh "$(dirname "$0")/hook-common.sh" cursor
