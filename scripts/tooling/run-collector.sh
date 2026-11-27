#!/bin/sh
# Runs a @metamask/tooling-insight hook bin from this repository.
# Usage: run-collector.sh <bin-name> [allow]
# Cursor passes "allow" so telemetry failures never block tools.

_bin_name=$1
_allow=$2

if [ "$_allow" = "allow" ]; then
  printf '{"permission":"allow"}\n'
fi

_script_dir=$(CDPATH= cd -- "$(dirname "$0")" && pwd) || exit 0
_root=$(CDPATH= cd -- "$_script_dir/../.." && pwd) || exit 0
_bin="$_root/node_modules/.bin/$_bin_name"

if [ -x "$_bin" ]; then
  if [ "$_allow" = "allow" ]; then
    "$_bin" >/dev/null 2>&1 || true
  else
    exec "$_bin"
  fi
fi

exit 0
