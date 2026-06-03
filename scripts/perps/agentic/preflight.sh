#!/bin/bash
# preflight.sh — TEMPORARY compatibility shim.
#
# The preflight orchestrator was ported to TypeScript at
# scripts/perps/agentic/preflight/preflight.ts (run via the a:ios / a:android /
# a:setup:* package scripts). This wrapper forwards all args + env to it so
# existing external callers (e.g. farmslot project.json, setup/android.sh) keep
# working unchanged during the migration.
#
# TODO: remove this file once every caller invokes preflight.ts directly.
set -euo pipefail
cd "$(dirname "$0")/../../.."
echo "[preflight.sh] compatibility shim → preflight.ts (this wrapper will be removed)" >&2
exec yarn ts-node --transpile-only --project scripts/perps/agentic/preflight/tsconfig.json scripts/perps/agentic/preflight/preflight.ts "$@"
