#!/bin/bash
# Define the folder and the output file
folder="ios"
output_file="ios-folder-diff.txt"

# Get the current branch
current_branch=$(git rev-parse --abbrev-ref HEAD)

if [ "$current_branch" = "main" ]; then
    # If the current branch is "main", get the diff for the last commit
    differences=$(git diff HEAD^ HEAD -- $folder)
else
    # If the current branch is not "main", get the diff with "main"
    differences=$(git diff main...$current_branch -- $folder)
fi

# Check if the differences string is empty
if [ -z "$differences" ]; then
    echo "No differences detected"
else
    echo "$differences" > $output_file
    # Later use the output file to checksum and save cache
    echo "Differences written to $output_file"
fi