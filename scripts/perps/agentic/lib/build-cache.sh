#!/bin/bash
# build-cache.sh — shared helpers for fingerprint-gated native build reuse.
#
# Two-tier cache:
#   Tier 1 (shared, one per host):  $MM_BUILD_CACHE_DIR (default ~/Library/Caches/mm-mobile-builds)
#   Tier 2 (per-worktree sidecar):  .agent/build-cache/<plat>/installed.json
#
# All functions are pure shell so preflight.sh can source this file directly.
# Callers must `set -euo pipefail` themselves; this file does not.

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

# Compute the current native fingerprint. Echoes the hash, returns 0 on success.
# Caches result in BUILD_CACHE_FP across one preflight run so we don't pay the
# ~1–2s @expo/fingerprint cost twice.
bc_fingerprint() {
  if [ -n "${BUILD_CACHE_FP:-}" ]; then
    printf '%s\n' "$BUILD_CACHE_FP"
    return 0
  fi
  local fp
  fp=$(node scripts/generate-fingerprint.js 2>/dev/null || true)
  if [ -z "$fp" ]; then
    return 1
  fi
  export BUILD_CACHE_FP="$fp"
  printf '%s\n' "$fp"
}

# True if shared artifact for (plat, fp) exists and looks valid.
bc_has_artifact() {
  local plat="$1" fp="$2"
  local p
  p=$(bc_artifact_path "$plat" "$fp")
  [ -e "$p" ]
}

# Read the per-worktree installed fingerprint (empty if unset).
bc_installed_fp() {
  local plat="$1"
  local f
  f=$(bc_installed_json "$plat")
  [ -f "$f" ] || { printf ''; return; }
  jq -r '.fingerprint // empty' "$f" 2>/dev/null || true
}

# Write per-worktree installed.json after a successful install.
bc_record_install() {
  local plat="$1" fp="$2" target="$3"
  local f
  f=$(bc_installed_json "$plat")
  mkdir -p "$(dirname "$f")"
  printf '{"fingerprint":"%s","target":"%s","installedAt":"%s"}\n' \
    "$fp" "$target" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$f"
}

# Store a freshly-built artifact into the shared cache (atomic mv).
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
  printf '{"fingerprint":"%s","builtAt":"%s","builderWorktree":"%s"}\n' \
    "$fp" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(pwd)" > "$meta"
}

# LRU prune of shared cache. Keeps newest N per platform (default 5).
bc_prune() {
  local plat="$1" keep="${2:-5}"
  local d
  d=$(bc_plat_dir "$plat")
  [ -d "$d" ] || return 0
  local ext
  [ "$plat" = "ios" ] && ext="app" || ext="apk"
  # List artifacts by mtime, newest first; drop everything past $keep.
  # `find -print0 | sort` is fine on macOS but we need portable mtime ranking.
  local entries
  # `-name "*.$ext"` matches both .app dirs (iOS) and .apk files (Android).
  # Stat newest-first by mtime; the awk strips the mtime prefix.
  entries=$(find "$d" -maxdepth 1 -name "*.$ext" 2>/dev/null \
    | xargs -I{} stat -f '%m %N' {} 2>/dev/null \
    | sort -rn \
    | awk '{ $1=""; sub(/^ /,""); print }')
  local i=0
  while IFS= read -r path; do
    [ -z "$path" ] && continue
    i=$((i + 1))
    [ "$i" -le "$keep" ] && continue
    local base="${path%.*}"
    rm -rf "$path" "${base}.meta.json"
  done <<< "$entries"
}

# Run a command under flock for (plat, fp). Releases lock when the function
# returns. Waits up to $BUILD_CACHE_LOCK_TIMEOUT seconds (default 1800 = 30min).
#
# Usage:
#   bc_with_lock ios "$FP" my_build_function arg1 arg2
#
# flock(1) availability: present on Linux. On macOS, fall back to a simple
# atomic-mkdir lock since flock isn't in base macOS. The mkdir lock is good
# enough for our single-host coordination.
bc_with_lock() {
  local plat="$1" fp="$2"; shift 2
  local lock
  lock=$(bc_lock_path "$plat" "$fp")
  bc_init_dirs "$plat"
  local timeout="${BUILD_CACHE_LOCK_TIMEOUT:-1800}"

  if command -v flock >/dev/null 2>&1; then
    # Use a real flock when available.
    (
      exec 9>"$lock"
      if ! flock -w "$timeout" 9; then
        echo "build-cache: timed out waiting for $lock" >&2
        return 1
      fi
      "$@"
    )
    return $?
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
  # Trap cleanup so a killed shell still frees the lock.
  trap "rmdir '$lockdir' 2>/dev/null || true" EXIT INT TERM
  local rc=0
  "$@" || rc=$?
  rmdir "$lockdir" 2>/dev/null || true
  trap - EXIT INT TERM
  return $rc
}
