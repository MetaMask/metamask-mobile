#!/usr/bin/env bash
# `yarn foxy`: get every prerequisite in place (see setup.mjs), then start the Foxy server.
set -euo pipefail
cd "$(dirname "$0")"

status=0
node setup.mjs || status=$?
case "$status" in
  0) ;;
  4) exit 0 ;; # an earlier `yarn foxy` is still running; setup printed its address
  *) exit "$status" ;;
esac

echo
exec node server.mjs
