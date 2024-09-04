#!/bin/bash

# Check for the required number of arguments
if [ $# -ne 2 ]; then
  echo "Usage: $0 <file_path> <size_limit_in_MB>"
  exit 1
fi

# Assign command line arguments to variables
FILE_PATH=$1
SIZE_LIMIT_MB=$2

# Calculate the file size in MB
FILE_SIZE_MB=$(stat -c %s "$FILE_PATH" | awk '{print $1/1024/1024}')

# Output the file size for logging purposes
echo "File size of $FILE_PATH: $FILE_SIZE_MB MB"

# Compare the file size with the threshold
if (( $(echo "$FILE_SIZE_MB > $SIZE_LIMIT_MB" | bc -l) )); then
  echo "Error: JS Bundle size exceeds the limit of $SIZE_LIMIT_MB MB"
  exit 1  # Exit with a non-zero status code to indicate failure
else
  echo "JS Bundle size is within the limit."
fi
