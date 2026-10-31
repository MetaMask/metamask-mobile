#!/bin/sh
# Runs a @metamask/tooling-insight hook bin from this repository.
# Usage: run-collector.sh <bin-name> [allow]
# Cursor passes "allow" so the hook returns {"permission":"allow"}
# until the collector bin can run, including in a new worktree.

_bin_name=$1
_allow=$2
_script_dir=$(CDPATH= cd -- "$(dirname "$0")" && pwd) || exit 0
_root=$(CDPATH= cd -- "$_script_dir/../.." && pwd) || exit 0
_bin="$_root/node_modules/.bin/$_bin_name"

if [ -x "$_bin" ]; then
  exec "$_bin"
fi

if [ "$_allow" = "allow" ]; then
  printf '{"permission":"allow"}\n'
fi

exit 0
