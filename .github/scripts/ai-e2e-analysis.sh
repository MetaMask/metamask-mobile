#!/bin/bash
set -e

# AI E2E Analysis Script
# This script handles the complex logic for running AI analysis and processing results
# Usage: ./ai-e2e-analysis.sh <event_name> [base_branch] [include_main_changes] [ios_enabled] [android_enabled] [has_analysis_label]

EVENT_NAME="$1"
BASE_BRANCH="${2:-}"
INCLUDE_MAIN_CHANGES="${3:-false}"
IOS_ENABLED="${4:-false}"
ANDROID_ENABLED="${5:-false}"
HAS_ANALYSIS_LABEL="${6:-false}"

echo "🤖 Running AI analysis..."

# Build command with dynamic arguments based on trigger type
BASE_CMD="node -r esbuild-register scripts/e2e/ai-e2e-tags-selector.ts --output json"

# Add base branch if specified (manual trigger)
if [ -n "$BASE_BRANCH" ] && [ "$BASE_BRANCH" != "origin/main" ]; then
  BASE_CMD="$BASE_CMD --base-branch '$BASE_BRANCH'"
fi

# Add include-main-changes flag
if [ "$EVENT_NAME" == "workflow_dispatch" ]; then
  if [ "$INCLUDE_MAIN_CHANGES" == "true" ]; then
    BASE_CMD="$BASE_CMD --include-main-changes"
  fi
else
  # For PR triggers, always include main changes for comprehensive analysis
  BASE_CMD="$BASE_CMD --include-main-changes"
fi

echo "🤖 Running AI analysis with command: $BASE_CMD"
echo "📋 Event name: $EVENT_NAME"
echo "📋 Include main changes input: $INCLUDE_MAIN_CHANGES"

# Debug git state
echo "🔍 Git debug info:"
FILES_WITH_MAIN=$(git diff --name-only origin/main..HEAD 2>/dev/null | wc -l || echo 'ERROR')
FILES_WITHOUT_MAIN=$(git diff --name-only origin/main...HEAD 2>/dev/null | wc -l || echo 'ERROR')
echo "- Files with include-main: $FILES_WITH_MAIN"
echo "- Files without include-main: $FILES_WITHOUT_MAIN"

RESULT=$(eval "$BASE_CMD")

# Validate JSON output
if ! echo "$RESULT" | jq . > /dev/null 2>&1; then
  echo "❌ Invalid JSON output from AI analysis"
  echo "Raw output: $RESULT"
  exit 1
fi

echo "📊 AI analysis completed successfully (builds running in parallel)"

# Parse results
TAGS=$(echo "$RESULT" | jq -r '.selectedTags | join("|")')  # Use pipe separator for grep regex
TAG_COUNT=$(echo "$RESULT" | jq -r '.selectedTags | length')
RISK_LEVEL=$(echo "$RESULT" | jq -r '.riskLevel')
TAG_DISPLAY=$(echo "$RESULT" | jq -r '.selectedTags | join(", ")')  # Human-readable format
REASONING=$(echo "$RESULT" | jq -r '.reasoning // "AI analysis completed"')
CONFIDENCE=$(echo "$RESULT" | jq -r '.confidence // 75')

echo "✅ Selected tags: $TAG_DISPLAY"
echo "📈 Risk level: $RISK_LEVEL"
echo "🔢 Tag count: $TAG_COUNT"

# Generate test matrix for GitHub Actions based on testFileBreakdown
TEST_MATRIX="[]"
if [ "$TAG_COUNT" -gt 0 ]; then
  TEST_MATRIX=$(echo "$RESULT" | jq -c '[
    .testFileBreakdown[] |
    select(.recommendedSplits > 0) |
    {
      tag: .tag,
      fileCount: .fileCount,
      recommendedSplits: .recommendedSplits,
      splits: [range(1; .recommendedSplits + 1)]
    } |
    .splits[] as $split |
    {
      tag: .tag,
      fileCount: .fileCount,
      split: $split,
      totalSplits: .recommendedSplits
    }
  ]')
fi

echo "🔢 Generated test matrix: $TEST_MATRIX"

# Determine if this is analysis-only mode
ANALYSIS_ONLY="false"
if [[ "$EVENT_NAME" == "pull_request" ]]; then
  if [[ "$HAS_ANALYSIS_LABEL" == "true" ]]; then
    ANALYSIS_ONLY="true"
    echo "🔍 Analysis-only mode detected - skipping builds and tests"
  fi
fi

# Set outputs for GitHub Actions
{
  echo "tags=$TAGS"
  echo "tags_display=$TAG_DISPLAY"
  echo "strategy=dynamic-$TAG_COUNT-tags"
  echo "test_matrix=$TEST_MATRIX"
  echo "risk_level=$RISK_LEVEL"
  echo "reasoning<<EOF"
  echo "$REASONING"
  echo "EOF"
  echo "confidence=$CONFIDENCE"
  echo "analysis_only=$ANALYSIS_ONLY"
} >> "$GITHUB_OUTPUT"

# Handle multi-line breakdown content carefully
BREAKDOWN=$(echo "$RESULT" | jq -r '.testFileBreakdown[]? | "  - " + .tag + ": " + (.fileCount | tostring) + " files → " + (.recommendedSplits | tostring) + " splits"' | tr '\n' '\n')
{
  echo "breakdown<<EOF"
  echo "$BREAKDOWN"
  echo "EOF"
} >> "$GITHUB_OUTPUT"

# Only run tests if we have test jobs in the matrix and not in analysis-only mode
MATRIX_LENGTH=$(echo "$TEST_MATRIX" | jq 'length')
if [[ "$ANALYSIS_ONLY" == "true" ]]; then
  echo "run_tests=false" >> "$GITHUB_OUTPUT"
  echo "🔍 Analysis-only mode - skipping all builds and tests"
elif [ "$TAG_COUNT" -eq 0 ]; then
  echo "run_tests=false" >> "$GITHUB_OUTPUT"
  echo "ℹ️ No E2E tests needed - AI determined changes are very low risk"
elif [ "$MATRIX_LENGTH" -gt 0 ]; then
  echo "run_tests=true" >> "$GITHUB_OUTPUT"
  echo "✅ Will run $((MATRIX_LENGTH * 2)) CI jobs ($MATRIX_LENGTH per platform × 2 platforms)"
else
  echo "run_tests=false" >> "$GITHUB_OUTPUT"
  echo "ℹ️ No E2E tests needed - selected tags have no test files"
fi

# Create readable test plan with file breakdown
if [[ "$ANALYSIS_ONLY" == "true" ]]; then
  echo "## 🔍 AI Analysis Report (Analysis-Only Mode)" >> "$GITHUB_STEP_SUMMARY"
  {
    echo "- **Selected Tags**: $TAG_DISPLAY"
    echo "- **Risk Level**: $RISK_LEVEL"
    echo "- **AI Confidence**: ${CONFIDENCE}%"
    echo "- **Mode**: Analysis-Only (no builds or tests)"
  } >> "$GITHUB_STEP_SUMMARY"
else
  echo "## 🎯 AI E2E Test Plan" >> "$GITHUB_STEP_SUMMARY"
  if [ "$TAG_COUNT" -eq 0 ]; then
    {
      echo "- **Selected Tags**: None (no tests needed)"
      echo "- **Risk Level**: $RISK_LEVEL"
      echo "- **AI Confidence**: ${CONFIDENCE}%"
      echo "- **Total CI Jobs**: 0 (AI determined changes are very low risk)"
    } >> "$GITHUB_STEP_SUMMARY"
  else
    {
      echo "- **Selected Tags**: $TAG_DISPLAY"
      echo "- **Risk Level**: $RISK_LEVEL"
      echo "- **AI Confidence**: ${CONFIDENCE}%"
      echo "- **Test Jobs**: $MATRIX_LENGTH (dynamically generated based on test files)"
    } >> "$GITHUB_STEP_SUMMARY"

    if [ "$MATRIX_LENGTH" -gt 0 ]; then
      echo "- **Total CI Jobs**: $((MATRIX_LENGTH * 2)) ($MATRIX_LENGTH per platform × 2 platforms)" >> "$GITHUB_STEP_SUMMARY"
    else
      echo "- **Total CI Jobs**: 0 (selected tags have no test files)" >> "$GITHUB_STEP_SUMMARY"
    fi
  fi
fi

# Add AI reasoning
{
  echo ""
  echo "### 🤖 AI Analysis Reasoning"
  echo "$REASONING"
} >> "$GITHUB_STEP_SUMMARY"

# Add test file breakdown if available
if [ -n "$BREAKDOWN" ]; then
  {
    echo ""
    echo "### 📊 Test File Breakdown"
    echo "$BREAKDOWN"
  } >> "$GITHUB_STEP_SUMMARY"
fi

echo "✅ AI analysis script completed successfully"