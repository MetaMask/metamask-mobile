#!/bin/bash
# build-cache.sh — shared helpers for fingerprint-gated native build reuse.
#
# Two-tier cache:
#   Tier 1 (shared, one per host):  $MM_BUILD_CACHE_DIR (default ~/Library/Caches/mm-mobile-builds)
#   Tier 2 (per-worktree sidecar):  .agent/build-cache/<plat>/installed.json
#
# All functions are pure shell so preflight.sh can source this file directly.
# Callers must `set -euo pipefail` themselves; this file does not.

# Source-time sanitization: drop any inherited claim on the private memo
# directory. Bash imports exported env vars as shell vars on startup, so a
# parent process running this lib could otherwise convince us we own a
# caller-supplied BC_MEMO_DIR and recurse rm -rf into it from cleanup.
# Only ownership set by bc_memo_init running in this shell, AFTER the unset
# below, is ever trusted.
unset BC_MEMO_DIR_OWNED BC_MEMO_DIR

# Resolve shared cache root. Honors override env, defaults per-OS.
bc_root() {
  if [ -n "${MM_BUILD_CACHE_DIR:-}" ]; then
    printf '%s\n' "$MM_BUILD_CACHE_DIR"
    return
  fi
  if [ "$(uname)" = "Darwin" ]; then
    printf '%s\n' "$HOME/Library/Caches/mm-mobile-builds"
  else
    printf '%s\n' "${XDG_CACHE_HOME:-$HOME/.cache}/mm-mobile-builds"
  fi
}

bc_plat_dir() {
  local plat="$1"
  printf '%s/%s\n' "$(bc_root)" "$plat"
}

bc_artifact_path() {
  local plat="$1" fp="$2"
  local ext
  [ "$plat" = "ios" ] && ext="app" || ext="apk"
  printf '%s/%s.%s\n' "$(bc_plat_dir "$plat")" "$fp" "$ext"
}

bc_meta_path() {
  local plat="$1" fp="$2"
  printf '%s/%s.meta.json\n' "$(bc_plat_dir "$plat")" "$fp"
}

bc_lock_path() {
  local plat="$1" fp="$2"
  printf '%s/%s.lock\n' "$(bc_plat_dir "$plat")" "$fp"
}

bc_installed_json() {
  local plat="$1"
  printf '.agent/build-cache/%s/installed.json\n' "$plat"
}

# Ensure shared + per-worktree dirs exist.
bc_init_dirs() {
  local plat="$1"
  mkdir -p "$(bc_plat_dir "$plat")"
  mkdir -p ".agent/build-cache/$plat"
}

# Compute the current native fingerprint. Memoized in $BC_MEMO_DIR/fp so
# command-substitution callers (`FP=$(bc_fingerprint)`) survive subshell exit.
# Falls back to per-call compute if BC_MEMO_DIR isn't initialized.
bc_fingerprint() {
  local memo=""
  if [ -n "${BC_MEMO_DIR:-}" ] && [ -d "$BC_MEMO_DIR" ] && [ -w "$BC_MEMO_DIR" ]; then
    memo="$BC_MEMO_DIR/fp"
    # Trust the file only if it is a regular file (not a symlink/dir) inside
    # our private dir; mktemp -d guarantees 0700 + exclusive ownership.
    if [ -f "$memo" ] && [ ! -L "$memo" ] && [ -s "$memo" ]; then
      cat "$memo"
      return 0
    fi
  fi
  local fp
  fp=$(node scripts/generate-fingerprint.js 2>/dev/null || true)
  if [ -z "$fp" ]; then
    return 1
  fi
  if [ -n "$memo" ]; then
    printf '%s' "$fp" > "$memo"
  fi
  printf '%s\n' "$fp"
}

# Create the private memo dir (0700, mktemp -d) and record ownership in a
# NON-EXPORTED shell variable that child processes cannot inherit.
# A forgeable on-disk sentinel would not be enough — anyone with write access
# to a victim dir could pre-create the marker and trick us into rm -rf'ing
# it. Storing ownership in this shell only means an attacker who controls
# BC_MEMO_DIR via env cannot also make us think we own the dir.
bc_memo_init() {
  if [ "${BC_MEMO_DIR_OWNED:-}" = "1" ] && [ -n "${BC_MEMO_DIR:-}" ] && [ -d "$BC_MEMO_DIR" ]; then
    return 0  # already created by us in this shell
  fi
  local dir
  dir=$(mktemp -d 2>/dev/null) || return 1
  chmod 700 "$dir" 2>/dev/null || true
  export BC_MEMO_DIR="$dir"
  # Deliberately not exported — child processes that inherit BC_MEMO_DIR
  # from us will not also inherit the ownership flag.
  BC_MEMO_DIR_OWNED=1
}

# Tear down the private memo dir — only if we own it in this shell.
# Never deletes an inherited / caller-supplied path.
bc_memo_cleanup() {
  if [ "${BC_MEMO_DIR_OWNED:-}" = "1" ] \
     && [ -n "${BC_MEMO_DIR:-}" ] \
     && [ -d "$BC_MEMO_DIR" ]; then
    rm -rf "$BC_MEMO_DIR"
  fi
  unset BC_MEMO_DIR
  unset BC_MEMO_DIR_OWNED
}

# Drop any inherited memo claim (bash imports env vars on startup, so a
# parent could otherwise convince us we own BC_MEMO_DIR) and create a fresh
# private dir. Called once at preflight startup.
bc_fingerprint_reset_memo() {
  unset BC_MEMO_DIR_OWNED BC_MEMO_DIR
  bc_memo_init
}

# True if shared artifact for (plat, fp) exists AND is non-trivially populated.
# Rejects empty .app dirs (no Info.plist) and zero-byte .apk files to avoid
# treating a half-written or aborted store as a cache hit.
bc_has_artifact() {
  local plat="$1" fp="$2"
  local p
  p=$(bc_artifact_path "$plat" "$fp")
  if [ "$plat" = "ios" ]; then
    [ -d "$p" ] && [ -f "$p/Info.plist" ]
  else
    [ -f "$p" ] && [ -s "$p" ]
  fi
}

# Read the per-worktree installed fingerprint (empty if unset).
bc_installed_fp() {
  local plat="$1"
  local f
  f=$(bc_installed_json "$plat")
  [ -f "$f" ] || { printf ''; return; }
  jq -r '.fingerprint // empty' "$f" 2>/dev/null || true
}

# Read the per-worktree installed target (sim UDID / adb serial). Empty if unset.
bc_installed_target() {
  local plat="$1"
  local f
  f=$(bc_installed_json "$plat")
  [ -f "$f" ] || { printf ''; return; }
  jq -r '.target // empty' "$f" 2>/dev/null || true
}

# Write per-worktree installed.json after a successful install.
# Uses jq for JSON escaping so unusual paths/targets don't produce invalid JSON.
bc_record_install() {
  local plat="$1" fp="$2" target="$3"
  local f
  f=$(bc_installed_json "$plat")
  mkdir -p "$(dirname "$f")"
  jq -n --arg fp "$fp" --arg target "$target" --arg installedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{fingerprint:$fp, target:$target, installedAt:$installedAt}' > "$f"
}

# Store a freshly-built artifact into the shared cache (atomic mv).
# JSON meta is written via jq to escape arbitrary paths.
bc_store_artifact() {
  local plat="$1" fp="$2" src="$3"
  local dst tmp meta
  dst=$(bc_artifact_path "$plat" "$fp")
  tmp="${dst}.tmp.$$"
  meta=$(bc_meta_path "$plat" "$fp")
  bc_init_dirs "$plat"
  rm -rf "$tmp" "$dst"
  cp -R "$src" "$tmp"
  mv "$tmp" "$dst"
  jq -n --arg fp "$fp" --arg builtAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg builderWorktree "$(pwd)" \
    '{fingerprint:$fp, builtAt:$builtAt, builderWorktree:$builderWorktree}' > "$meta"
}

# Portable mtime extraction. macOS BSD stat uses -f; GNU stat uses -c.
# Echoes "<mtime-epoch> <path>" per line. Silent on stat errors.
bc__stat_mtime() {
  local path="$1"
  if stat -f '%m %N' "$path" 2>/dev/null; then
    return 0
  fi
  stat -c '%Y %n' "$path" 2>/dev/null || true
}

# LRU prune of shared cache. Keeps newest N per platform (default 5).
bc_prune() {
  local plat="$1" keep="${2:-5}"
  local d
  d=$(bc_plat_dir "$plat")
  [ -d "$d" ] || return 0
  local ext
  [ "$plat" = "ios" ] && ext="app" || ext="apk"
  local entries
  entries=$(
    find "$d" -maxdepth 1 -name "*.$ext" 2>/dev/null \
      | while IFS= read -r p; do bc__stat_mtime "$p"; done \
      | sort -rn \
      | awk '{ $1=""; sub(/^ /,""); print }'
  )
  local i=0
  while IFS= read -r path; do
    [ -z "$path" ] && continue
    i=$((i + 1))
    [ "$i" -le "$keep" ] && continue
    local base="${path%.*}"
    rm -rf "$path" "${base}.meta.json"
  done <<< "$entries"
}

# Persistent-fd lock helpers. Use these when the locked region is too large to
# wrap in a single function call. Acquire returns 0 on success, 1 on timeout.
# Release tears down whichever lock mechanism was used.
#
# Usage:
#   bc_lock_acquire ios "$FP" || fail "build-cache: lock timeout"
#   trap 'bc_lock_release' EXIT
#   ... locked section ...
#   bc_lock_release
#   trap - EXIT
bc_lock_acquire() {
  local plat="$1" fp="$2"
  local lock
  lock=$(bc_lock_path "$plat" "$fp")
  bc_init_dirs "$plat"
  local timeout="${BUILD_CACHE_LOCK_TIMEOUT:-1800}"

  if command -v flock >/dev/null 2>&1; then
    exec 9>"$lock"
    if ! flock -w "$timeout" 9; then
      exec 9>&-
      echo "build-cache: timed out waiting for $lock" >&2
      return 1
    fi
    BUILD_CACHE_LOCK_KIND="flock"
    BUILD_CACHE_LOCK_PATH="$lock"
    return 0
  fi

  # macOS fallback: mkdir-based mutex with poll.
  local lockdir="${lock}.d"
  local waited=0
  while ! mkdir "$lockdir" 2>/dev/null; do
    if [ "$waited" -ge "$timeout" ]; then
      echo "build-cache: timed out waiting for $lockdir" >&2
      return 1
    fi
    sleep 1
    waited=$((waited + 1))
  done
  BUILD_CACHE_LOCK_KIND="mkdir"
  BUILD_CACHE_LOCK_PATH="$lockdir"
  return 0
}

bc_lock_release() {
  case "${BUILD_CACHE_LOCK_KIND:-}" in
    flock)
      exec 9>&- 2>/dev/null || true
      ;;
    mkdir)
      [ -n "${BUILD_CACHE_LOCK_PATH:-}" ] && rmdir "$BUILD_CACHE_LOCK_PATH" 2>/dev/null || true
      ;;
  esac
  unset BUILD_CACHE_LOCK_KIND BUILD_CACHE_LOCK_PATH
}

# Function-scoped lock wrapper (kept for callers that have a tight body).
# For the larger preflight build region, prefer bc_lock_acquire / bc_lock_release.
bc_with_lock() {
  local plat="$1" fp="$2"; shift 2
  bc_lock_acquire "$plat" "$fp" || return 1
  local rc=0
  "$@" || rc=$?
  bc_lock_release
  return $rc
}
