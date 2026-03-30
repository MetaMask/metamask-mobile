#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Repo root (this package lives at scripts/money-movement/debug-dashboard/)
MOBILE_DIR="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"
BRIDGE_DEST="$MOBILE_DIR/app/components/UI/Ramp/debug"
INIT_FILE="app/core/Engine/controllers/ramps-controller/ramps-controller-init.ts"

# Resolve the actual .git directory (handles worktrees)
resolve_git_dir() {
  local dot_git="$MOBILE_DIR/.git"
  if [ -f "$dot_git" ]; then
    # This is a worktree — .git is a file with "gitdir: <path>"
    local gitdir
    gitdir=$(sed 's/^gitdir: //' "$dot_git")
    # Resolve relative paths
    if [[ "$gitdir" != /* ]]; then
      gitdir="$MOBILE_DIR/$gitdir"
    fi
    # The exclude file lives in the main repo's .git/info/, not the worktree dir
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
echo "  Ramps Debug Dashboard - Setup"
echo "  =============================="
echo ""

# 1. Install ws dependency for the server
echo "  [1/4] Installing server dependencies..."
cd "$SCRIPT_DIR"
npm install --silent 2>/dev/null
echo "         Done."

# 2. Copy bridge into the mobile app
echo "  [2/4] Copying bridge into mobile app..."
mkdir -p "$BRIDGE_DEST"
cp "$SCRIPT_DIR/bridge/RampsDebugBridge.ts" "$BRIDGE_DEST/RampsDebugBridge.ts"
echo "         -> $BRIDGE_DEST/RampsDebugBridge.ts"

# 3. Add to .git/info/exclude (if not already there)
echo "  [3/4] Adding bridge to local git exclude..."
if ! grep -qF "$EXCLUDE_ENTRY" "$EXCLUDE_FILE" 2>/dev/null; then
  echo "$EXCLUDE_ENTRY" >> "$EXCLUDE_FILE"
  echo "         Added '$EXCLUDE_ENTRY' to git exclude"
else
  echo "         Already in git exclude"
fi

# 4. Patch ramps-controller-init.ts and skip-worktree it
echo "  [4/4] Patching ramps-controller-init.ts..."
cd "$MOBILE_DIR"

INIT_FULL="$MOBILE_DIR/$INIT_FILE"

# First, undo any previous skip-worktree so we can restore cleanly
git update-index --no-skip-worktree "$INIT_FILE" 2>/dev/null || true
git checkout -- "$INIT_FILE" 2>/dev/null || true

# Add the import line after the @metamask/ramps-controller import
sed -i '' "/from '@metamask\/ramps-controller';/a\\
import { initRampsDebugBridge } from '../../../../components/UI/Ramp/debug/RampsDebugBridge';
" "$INIT_FULL"

# Add the __DEV__ block before the return statement
sed -i '' '/^  return {$/i\
\  if (__DEV__) {\
\    initRampsDebugBridge(controller, controllerMessenger);\
\  }\
\
' "$INIT_FULL"

echo "         Patched successfully."

# Apply skip-worktree so git ignores the change
git update-index --skip-worktree "$INIT_FILE"
echo "         Applied --skip-worktree to $INIT_FILE"

echo ""
echo "  Setup complete!"
echo ""
echo "  To start the dashboard:"
echo "    cd $SCRIPT_DIR && node server.mjs"
echo "    Then open http://localhost:8099"
echo ""
echo "  To undo everything:"
echo "    bash $SCRIPT_DIR/teardown.sh"
echo ""
