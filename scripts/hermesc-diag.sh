#!/bin/bash
# TEMPORARY diagnostic wrapper for hermesc — RN 0.85 Android E2E hermesc SIGSEGV (exit 139)
# investigation on CI. Wired up via `react.hermesCommand` in android/app/build.gradle.
# REVERT THIS COMMIT once root cause is found.
#
# What it does:
#   1. Logs runner CPU model/flags, kernel, and stack ulimit (SIGSEGV in early compile
#      phase could be a stack overflow or an unsupported-CPU-instruction issue).
#   2. Raises the stack limit to unlimited before invoking the real hermesc.
#   3. On failure: preserves the input JS bundle into hermesc-diag-artifacts/ (uploaded
#      as a workflow artifact) so the exact CI bundle can be replayed locally, then
#      retries once WITHOUT -O to test whether the optimizer is the trigger.
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

case "$(uname -s)" in
  Linux) OSBIN=linux64-bin ;;
  Darwin) OSBIN=osx-bin ;;
  *) OSBIN=win64-bin ;;
esac
HERMESC="$ROOT/node_modules/hermes-compiler/hermesc/$OSBIN/hermesc"

log() { echo "[hermesc-diag] $*" >&2; }

log "binary: $HERMESC"
log "hermes-compiler version: $(node -p "require('$ROOT/node_modules/hermes-compiler/package.json').version" 2>/dev/null || echo unknown)"
log "args: $*"
log "uname: $(uname -a)"
log "ulimit -s (before): $(ulimit -s)"
ulimit -s unlimited 2>/dev/null || ulimit -s 65520 2>/dev/null || true
log "ulimit -s (after): $(ulimit -s)"
if [ -r /proc/cpuinfo ]; then
  log "cpu model: $(grep -m1 'model name' /proc/cpuinfo | cut -d: -f2-)"
  log "cpu flags: $(grep -m1 '^flags' /proc/cpuinfo | tr ' ' '\n' | grep -Ex 'avx|avx2|avx512f|avx512vl|avx512bw|sse4_2|bmi1|bmi2' | sort -u | tr '\n' ' ')"
fi
if command -v free >/dev/null 2>&1; then
  log "memory: $(free -m | grep -m1 Mem:)"
fi

"$HERMESC" "$@"
rc=$?
log "exit: $rc"

if [ "$rc" -ne 0 ]; then
  # Preserve the input bundle so CI's exact bytes can be replayed locally.
  DIAG_DIR="$ROOT/hermesc-diag-artifacts"
  mkdir -p "$DIAG_DIR"
  for a in "$@"; do
    if [ -f "$a" ]; then
      log "preserving input file for artifact upload: $a"
      cp "$a" "$DIAG_DIR/" || true
    fi
  done

  # Retry without -O to test whether the optimizer pass is the crash trigger.
  newargs=()
  for a in "$@"; do
    [ "$a" = "-O" ] || newargs+=("$a")
  done
  log "retrying WITHOUT -O ..."
  "$HERMESC" "${newargs[@]}"
  rc2=$?
  log "retry (no -O) exit: $rc2"
  # If the no-O retry succeeds, let the build continue — the resulting APK is
  # unoptimized but valid, and the retry outcome is the diagnostic signal.
  exit "$rc2"
fi

exit "$rc"
