# Script to leverage the usage of ccache in the pipeline
# Check differences for a given folder and output file
check_folder_diff() {
  local folder="$1"
  local output_file="$2"
  local current_branch=$(git rev-parse --abbrev-ref HEAD)

  if [ "$current_branch" = "main" ]; then
    # If on main branch, skip cache restore but save it for future runs
    echo "On main branch, we will not use cache, but will save it for future runs"
    envman add --key SKIP_CCACHE_RESTORE --value true
  else
    # Fetch changes from the main branch
    git fetch origin refs/heads/main

    # Get the differences between the current branch and the main branch for the specified folder
    local differences=$(git diff origin/main...$current_branch -- $folder)

    # Check if there are no differences
    if [ -z "$differences" ]; then
      # If no differences, use the main cache and skip cache upload
      echo "No differences detected, we will use main cache"
      envman add --key SKIP_CCACHE_UPLOAD --value true
      envman add --key USE_MAIN_CCACHE --value true
    else
      # If there are differences, write them to the output file
      echo "$differences" > $output_file
      echo "Differences written to $output_file"
    fi
  fi
}

# Check if both folder_to_check and output_file_path are provided
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Error: Missing arguments. Please provide both folder_to_check and output_file_path."
  echo "Example: $0 ios ios-diff.txt"
else
  # Check differences for the specified folder and write to the specified output file
  folder_to_check="$1"
  output_file_path="$2"
  check_folder_diff "$folder_to_check" "$output_file_path"
fi