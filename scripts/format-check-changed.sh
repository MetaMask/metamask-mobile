#!/bin/bash
# Format Check for Changed Files
# Purpose: Validates Prettier formatting on files changed in a PR or commit.
# Used by CI (yarn format:check:changed) to catch formatting issues before merge.
# Complements the pre-push hook to provide server-side validation.

set -e
set -o pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Starting Prettier format check for changed files...${NC}"
echo ""

# Determine base commit for comparison
# In CI: Use GitHub Actions environment variables
# Locally: Use merge-base with origin/main or main
determine_base_commit() {
  local base_commit=""

  # GitHub Actions PR context
  if [ -n "$GITHUB_BASE_REF" ]; then
    echo -e "${BLUE}ℹ️  CI detected: Checking PR against base branch ${GITHUB_BASE_REF}${NC}" >&2
    base_commit="origin/${GITHUB_BASE_REF}"

    # Verify the base commit exists
    if ! git rev-parse "$base_commit" >/dev/null 2>&1; then
      echo -e "${YELLOW}⚠️  Warning: ${base_commit} not found, trying to fetch...${NC}" >&2
      git fetch origin "${GITHUB_BASE_REF}" >/dev/null 2>&1 || true

      if ! git rev-parse "$base_commit" >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Warning: Could not resolve ${base_commit}, falling back to merge-base${NC}" >&2
        base_commit=""
      fi
    fi
  fi

  # If not in PR context or base not found, use merge-base with main
  if [ -z "$base_commit" ]; then
    echo -e "${BLUE}ℹ️  Using merge-base with origin/main${NC}" >&2
    base_commit=$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null || echo "")

    if [ -z "$base_commit" ]; then
      echo -e "${YELLOW}⚠️  Warning: Could not find merge-base with main, falling back to HEAD~1${NC}" >&2
      base_commit="HEAD~1"
    fi
  fi

  echo "$base_commit"
}

BASE_COMMIT=$(determine_base_commit)
echo -e "${BLUE}📊 Base commit: ${BASE_COMMIT}${NC}"
echo -e "${BLUE}📊 Current commit: HEAD${NC}"
echo ""

# Get list of changed files
# Use --diff-filter=ACMR to exclude deleted files
# Compare BASE_COMMIT..HEAD to get all changes in the current branch
if ! git diff --name-only --diff-filter=ACMR "${BASE_COMMIT}"...HEAD >/dev/null 2>&1; then
  echo -e "${RED}❌ Error: git diff command failed${NC}"
  echo -e "${YELLOW}💡 This might happen if the base commit is not available${NC}"
  exit 1
fi

# Get files and filter for JS/TS/JSON/feature files
FILES=$(git diff --name-only --diff-filter=ACMR "${BASE_COMMIT}"...HEAD 2>/dev/null | grep -E '\.(js|jsx|ts|tsx|json|feature)$' || true)

if [ -z "$FILES" ]; then
  echo -e "${GREEN}✅ No JavaScript/TypeScript/JSON/feature files changed${NC}"
  echo -e "${BLUE}ℹ️  Nothing to check${NC}"
  exit 0
fi

# Count files
FILE_COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
echo -e "${BLUE}📝 Found ${FILE_COUNT} file(s) to check${NC}"

# Show which files are being checked (first 10)
if [ "$FILE_COUNT" -gt 0 ]; then
  echo -e "${BLUE}📄 Files being checked:${NC}"
  echo "$FILES" | head -10 | sed 's/^/  - /'
  if [ "$FILE_COUNT" -gt 10 ]; then
    echo -e "  ${BLUE}... and $((FILE_COUNT - 10)) more${NC}"
  fi
  echo ""
fi

# Warn about potential performance impact for large changesets
if [ "$FILE_COUNT" -gt 50 ]; then
  echo -e "${YELLOW}⚠️  Large changeset detected (${FILE_COUNT} files) - this may take a moment...${NC}"
  echo ""
fi

# Run Prettier check
echo -e "${BLUE}🔍 Running Prettier format check...${NC}"
echo ""

# Use xargs to pass files to prettier
# --no-run-if-empty handles empty input gracefully
PRETTIER_EXIT_CODE=0
echo "$FILES" | xargs yarn prettier --check --ignore-unknown || PRETTIER_EXIT_CODE=$?

echo ""

if [ $PRETTIER_EXIT_CODE -ne 0 ]; then
  echo -e "${RED}❌ Prettier formatting check failed!${NC}"
  echo ""
  echo -e "${YELLOW}These files have formatting issues. To fix them, run:${NC}"
  echo ""
  echo -e "  ${GREEN}yarn prettier --write <file>${NC}"
  echo ""
  echo -e "${YELLOW}Or format all changed files:${NC}"
  echo ""
  echo "$FILES" | tr '\0' '\n' | while IFS= read -r file; do
    echo -e "  ${GREEN}yarn prettier --write \"$file\"${NC}"
  done
  echo ""
  echo -e "${BLUE}💡 Tip: You can also use your IDE's format-on-save feature${NC}"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ All files are properly formatted!${NC}"
echo -e "${BLUE}ℹ️  Prettier format check passed${NC}"
exit 0
