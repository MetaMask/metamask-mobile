#!/usr/bin/env bash
#
# Type-aware lint step, powered by oxlint + tsgolint (typescript-go / TS7).
# Runs ONLY the type-aware rules ESLint can't afford (see .oxlintrc.json) and is
# meant to run alongside the normal ESLint pass.
#
# Why the swap: oxlint/tsgolint can only read `./tsconfig.json`, and the real one
# is not TS7-compatible (baseUrl / node resolution / non-relative paths). We are
# not upgrading TypeScript, so this temporarily swaps in tsconfig.oxlint.json and
# ALWAYS restores the original byte-for-byte (even on failure / Ctrl-C). The
# backup is the literal file, so uncommitted local edits to tsconfig.json survive.
#
# Usage:
#   yarn lint:type-aware            # lint app + tests
#   yarn lint:type-aware app/core   # lint a subset
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f tsconfig.oxlint.json ]; then
  echo "error: tsconfig.oxlint.json not found at repo root" >&2
  exit 1
fi

BACKUP="$(mktemp)"
cp tsconfig.json "$BACKUP"
restore() { cp "$BACKUP" tsconfig.json && rm -f "$BACKUP"; }
trap restore EXIT INT TERM

cp tsconfig.oxlint.json tsconfig.json

# Default scope = app + tests (scripts/ has its own non-TS7 tsconfig).
if [ "$#" -eq 0 ]; then
  set -- app tests
fi

NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=12288}" \
  yarn oxlint --type-aware -c .oxlintrc.json "$@"
