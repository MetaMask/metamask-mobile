#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"
BRIDGE_DEST="$MOBILE_DIR/app/components/UI/Ramp/debug"
INIT_FILE="app/core/Engine/controllers/ramps-controller/ramps-controller-init.ts"

# Resolve the actual .git directory (handles worktrees)
resolve_git_dir() {
  local dot_git="$MOBILE_DIR/.git"
  if [ -f "$dot_git" ]; then
    local gitdir
    gitdir=$(sed 's/^gitdir: //' "$dot_git")
    if [[ "$gitdir" != /* ]]; then
      gitdir="$MOBILE_DIR/$gitdir"
    fi
    local common_dir
    common_dir=$(cd "$gitdir" && git rev-parse --git-common-dir 2>/dev/null || echo "$gitdir")
    if [[ "$common_dir" != /* ]]; then
      common_dir="$gitdir/$common_dir"
    fi
    echo "$common_dir"
  else
    echo "$dot_git"
  fi
}

GIT_DIR="$(resolve_git_dir)"
EXCLUDE_FILE="$GIT_DIR/info/exclude"
EXCLUDE_ENTRY="app/components/UI/Ramp/debug/"

echo ""
echo "  Ramps Debug Dashboard - Teardown"
echo "  ================================="
echo ""

cd "$MOBILE_DIR"

# 1. Remove skip-worktree and restore the init file
echo "  [1/3] Restoring ramps-controller-init.ts..."
git update-index --no-skip-worktree "$INIT_FILE" 2>/dev/null || true
git checkout -- "$INIT_FILE" 2>/dev/null || true
echo "         Restored to original."

# 2. Remove the bridge directory
echo "  [2/3] Removing bridge files..."
if [ -d "$BRIDGE_DEST" ]; then
  rm -rf "$BRIDGE_DEST"
  echo "         Removed $BRIDGE_DEST"
else
  echo "         Already removed."
fi

# 3. Remove the exclude entry
echo "  [3/3] Cleaning git exclude..."
if [ -f "$EXCLUDE_FILE" ] && grep -qF "$EXCLUDE_ENTRY" "$EXCLUDE_FILE" 2>/dev/null; then
  grep -vF "$EXCLUDE_ENTRY" "$EXCLUDE_FILE" > "${EXCLUDE_FILE}.tmp"
  mv "${EXCLUDE_FILE}.tmp" "$EXCLUDE_FILE"
  echo "         Removed '$EXCLUDE_ENTRY' from git exclude"
else
  echo "         Already clean."
fi

echo ""
echo "  Teardown complete. All local changes removed."
echo "  git status should show no changes."
echo ""
