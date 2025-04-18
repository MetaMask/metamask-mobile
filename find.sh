#!/bin/bash

# Script to identify files with only formatting and/or comma changes

# Usage explanation if no arguments provided
if [ $# -eq 0 ]; then
  echo "Usage: ./find-format-and-comma-changes.sh <base-branch>"
  echo "Example: ./find-format-and-comma-changes.sh main"
  exit 1
fi

BASE_BRANCH="$1"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
DEBUG=${2:-false}

echo "Finding files with only formatting and/or comma changes between $BASE_BRANCH and $CURRENT_BRANCH..."

# Get list of all modified files in the PR
CHANGED_FILES=$(git diff --name-only "$BASE_BRANCH"..."$CURRENT_BRANCH")

FORMAT_COMMA_ONLY_FILES=()

# Check each file
for FILE in $CHANGED_FILES; do
  # Skip files that don't exist (were deleted)
  if [ ! -f "$FILE" ]; then
    continue
  fi
  
  # Get content from base branch
  BASE_CONTENT=$(git show "$BASE_BRANCH:$FILE" 2>/dev/null)
  
  # If file doesn't exist in base branch, skip
  if [ $? -ne 0 ]; then
    continue
  fi
  
  # Get current content
  CURRENT_CONTENT=$(cat "$FILE")
  
  # First check if the files are already identical
  if [ "$BASE_CONTENT" == "$CURRENT_CONTENT" ]; then
    continue
  fi
  
  # Remove all whitespace AND commas for comparison
  STRIPPED_BASE=$(echo "$BASE_CONTENT" | tr -d " \t\n\r,")
  STRIPPED_CURRENT=$(echo "$CURRENT_CONTENT" | tr -d " \t\n\r,")
  
  # If stripped versions are identical, only formatting and/or commas changed
  if [ "$STRIPPED_BASE" == "$STRIPPED_CURRENT" ]; then
    FORMAT_COMMA_ONLY_FILES+=("$FILE")
    
    if [ "$DEBUG" = "true" ]; then
      echo "DEBUG: Format/comma-only change detected in $FILE"
      # Check what kind of changes happened
      WHITESPACE_BASE=$(echo "$BASE_CONTENT" | tr -d ",")
      WHITESPACE_CURRENT=$(echo "$CURRENT_CONTENT" | tr -d ",")
      
      COMMA_BASE=$(echo "$BASE_CONTENT" | tr -d " \t\n\r")
      COMMA_CURRENT=$(echo "$CURRENT_CONTENT" | tr -d " \t\n\r")
      
      if [ "$WHITESPACE_BASE" != "$WHITESPACE_CURRENT" ] && [ "$COMMA_BASE" != "$COMMA_CURRENT" ]; then
        echo "  Both whitespace and comma changes"
      elif [ "$WHITESPACE_BASE" != "$WHITESPACE_CURRENT" ]; then
        echo "  Whitespace changes only"
      else
        echo "  Comma changes only"
      fi
    fi
  fi
done

# Output the results
if [ ${#FORMAT_COMMA_ONLY_FILES[@]} -eq 0 ]; then
  echo "No files with only formatting/comma changes found."
else
  echo "Files with only formatting and/or comma changes (${#FORMAT_COMMA_ONLY_FILES[@]} out of total ${#CHANGED_FILES[@]} files):"
  printf '%s\n' "${FORMAT_COMMA_ONLY_FILES[@]}"
  
  # Save to a file
  printf '%s\n' "${FORMAT_COMMA_ONLY_FILES[@]}" > format_comma_only_files.txt
  echo "List saved to format_comma_only_files.txt"
  
  echo -e "\nTo revert these changes, run:"
  echo "xargs git checkout $BASE_BRANCH -- < format_comma_only_files.txt"
  echo "git commit -m \"Revert formatting and comma-only changes\""
fi