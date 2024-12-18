#!/bin/bash

set -e
set -u
set -o pipefail

readonly CSV_FILE='commits.csv'

# Add release branch arg name
RELEASE_BRANCH_NAME="${1}"

# Temporary file for new entries
NEW_ENTRIES=$(mktemp)

# Backup file for existing CHANGELOG
CHANGELOG="CHANGELOG.md"
CHANGELOG_BACKUP="$CHANGELOG.bak"

# Backup existing CHANGELOG.md
cp "$CHANGELOG" "$CHANGELOG_BACKUP"

# Function to append entry to the correct category in the temp file
append_entry() {
    local change_type="$1"
    local entry="$2"
    # Ensure the "Other" category is explicitly handled
    case "$change_type" in
        Added|Changed|Fixed) ;;
        *) change_type="Other" ;; # Categorize as "Other" if not matching predefined categories
    esac
    echo "$entry" >> "$NEW_ENTRIES-$change_type"
}

# Read the CSV file and append entries to temp files based on change type
while IFS=, read -r commit_message author pr_link team change_type
do
    pr_id=$(echo "$pr_link" | grep -o '[^/]*$')
    entry="- [#$pr_id]($pr_link): $commit_message"
    append_entry "$change_type" "$entry"
done < <(tail -n +2 "$CSV_FILE") # Skip the header line

# Function to insert new entries into CHANGELOG.md after a specific line
insert_new_entries() {
    local marker="## Current Main Branch"
    local temp_changelog=$(mktemp)

    # Find the line number of the marker
    local line_num=$(grep -n "$marker" "$CHANGELOG_BACKUP" | cut -d ':' -f 1)

    # Split the existing CHANGELOG at the marker line
    head -n "$line_num" "$CHANGELOG_BACKUP" > "$temp_changelog"

    # Append the release header
    echo "" >> "$temp_changelog"
    echo "## $RELEASE_BRANCH_NAME - <Date>" >> "$temp_changelog"
    echo "" >> "$temp_changelog"

    # Append new entries for each change type if they exist
    for change_type in Added Changed Fixed Other; do
        if [[ -s "$NEW_ENTRIES-$change_type" ]]; then
            echo "### $change_type" >> "$temp_changelog"
            cat "$NEW_ENTRIES-$change_type" >> "$temp_changelog"
            echo "" >> "$temp_changelog" # Add a newline for spacing
        fi
    done

    # Append the rest of the original CHANGELOG content
    tail -n +$((line_num + 1)) "$CHANGELOG_BACKUP" >> "$temp_changelog"

    # Replace the original CHANGELOG with the updated one
    mv "$temp_changelog" "$CHANGELOG"
}

# Trap to ensure cleanup happens
trap 'rm -f "$NEW_ENTRIES-"* "$CHANGELOG_BACKUP"' EXIT

# Insert new entries into CHANGELOG.md
insert_new_entries

echo 'CHANGELOG updated'