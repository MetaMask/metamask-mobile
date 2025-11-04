#!/bin/bash

# Script to create and sync chore/temp-nightly branch with main
# This script ALWAYS takes main's changes and discards any conflicts
# Usage: ./scripts/create-temp-nightly-branch.sh

set -e  # Exit on any error

BRANCH_NAME="chore/temp-nightly"
MAIN_BRANCH="main"

echo "🚀 Starting to create/sync $BRANCH_NAME branch..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Stash any uncommitted changes
if ! git diff --quiet || ! git diff --staged --quiet; then
    echo "📦 Stashing uncommitted changes..."
    git stash push -m "Auto-stash before creating $BRANCH_NAME branch"
    STASHED=true
else
    STASHED=false
fi

# Fetch latest changes from remote
echo "📡 Fetching latest changes from remote..."
git fetch origin

# Switch to main branch
echo "🔄 Switching to $MAIN_BRANCH branch..."
git checkout $MAIN_BRANCH

# Pull latest changes from main
echo "⬇️  Pulling latest changes from $MAIN_BRANCH..."
git pull origin $MAIN_BRANCH

# Check if the temp-nightly branch already exists locally
if git show-ref --verify --quiet refs/heads/$BRANCH_NAME; then
    echo "🔄 Branch $BRANCH_NAME already exists locally, switching to it..."
    git checkout $BRANCH_NAME
    
    # ALWAYS take main's changes - discard any local commits/conflicts
    echo "🔄 Syncing $BRANCH_NAME with $MAIN_BRANCH (discarding any conflicts)..."
    echo "⚠️  This will discard ANY commits in $BRANCH_NAME that aren't in $MAIN_BRANCH"
    git reset --hard origin/$MAIN_BRANCH
    
    # Clean any untracked files that might cause issues
    git clean -fd
else
    # Create and switch to the new branch
    echo "🌿 Creating new branch $BRANCH_NAME from $MAIN_BRANCH..."
    git checkout -b $BRANCH_NAME
fi

# Check if branch exists on remote
if git ls-remote --exit-code --heads origin $BRANCH_NAME > /dev/null 2>&1; then
    echo "⬆️  Force pushing to remote $BRANCH_NAME (overriding any remote conflicts)..."
    echo "⚠️  This will overwrite remote $BRANCH_NAME with main's content"
    git push --force-with-lease origin $BRANCH_NAME
else
    echo "⬆️  Pushing new branch $BRANCH_NAME to remote..."
    git push -u origin $BRANCH_NAME
fi

# Restore stashed changes if any
if [ "$STASHED" = true ]; then
    echo "📦 Restoring stashed changes..."
    git stash pop
fi

echo "✅ Successfully synced branch $BRANCH_NAME with $MAIN_BRANCH"
echo "📍 Current branch: $(git branch --show-current)"
echo "🔗 Branch is tracking: $(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo 'No upstream set')"
echo "✨ $BRANCH_NAME is now identical to $MAIN_BRANCH (any conflicts were resolved in favor of $MAIN_BRANCH)"
