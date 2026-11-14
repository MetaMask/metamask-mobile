#!/bin/sh
# Cursor preToolUse entry for @metamask/tooling-insight.
_dir=$(CDPATH= cd -- "$(dirname "$0")" && pwd) || exit 0
exec /bin/sh "$_dir/run-collector.sh" tooling-insight-cursor-pre-tool allow
