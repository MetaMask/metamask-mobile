#!/bin/bash
# Subcommand bridge over lib/build-cache.sh so preflight.ts reuses its hardened
# cache + lock logic rather than re-porting it in TypeScript. See
# preflight/README.md. bc_* helpers assume repo-root cwd, so cd there first.
#
# `lock-hold` holds the per-fingerprint build lock across the whole .ts build:
# prints LOCKED, then blocks on stdin; the parent releases by closing the pipe
# (cat hits EOF -> EXIT trap runs bc_lock_release).
#
# Not `set -e`: bc_has_artifact / bc_fingerprint return non-zero as signal.
set -uo pipefail

cd "$(dirname "$0")/../../../.."
# shellcheck disable=SC1091
. scripts/perps/agentic/lib/build-cache.sh

cmd="${1:-}"
shift || true

case "$cmd" in
  fingerprint)
    bc_fingerprint
    ;;
  has)
    if bc_has_artifact "$1" "$2"; then echo true; else echo false; fi
    ;;
  artifact-path)
    bc_artifact_path "$1" "$2"
    ;;
  installed-fp)
    bc_installed_fp "$1"
    ;;
  installed-target)
    bc_installed_target "$1"
    ;;
  record-install)
    bc_record_install "$1" "$2" "$3"
    ;;
  store)
    if bc_store_artifact "$1" "$2" "$3"; then echo ok; else echo fail; exit 1; fi
    ;;
  prune)
    bc_prune "$1" "${2:-5}"
    ;;
  snapshot)
    bc_snapshot "$1" "$2"
    ;;
  drift)
    bc_drift "$1" "$2"
    ;;
  lock-hold)
    if bc_lock_acquire "$1" "$2"; then
      trap 'bc_lock_release' EXIT
      echo LOCKED
      cat >/dev/null
    else
      echo LOCK_FAIL
      exit 1
    fi
    ;;
  *)
    echo "usage: build-cache-cli.sh <fingerprint|has|artifact-path|installed-fp|installed-target|record-install|store|prune|snapshot|drift|lock-hold> ..." >&2
    exit 2
    ;;
esac
