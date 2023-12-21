# Script to leverage the usage of ccache in the pipeline
# Check differences for a given folder and save the checksum as CCACHE_KEY
set_cache_envs() {
  local folder="$1"
  local current_branch=$(git rev-parse --abbrev-ref HEAD)
  local prefix_ccache_key="ccache-$folder"

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
      envman add --key CCACHE_KEY --value "$prefix_ccache_key-main"
      echo "Checksum (CCACHE_KEY) set to $prefix_ccache_key-main"
    else
      # Generate a checksum for the differences and set it as CCACHE_KEY
      local checksum=$(echo "$differences" | sha512sum | awk '{print $1}')
      envman add --key CCACHE_KEY --value "$prefix_ccache_key-$checksum"
      echo "Checksum (CCACHE_KEY) set to $prefix_ccache_key-$checksum"
    fi
  fi
}

# Check if both folder_to_check is provided
if [ -z "$1" ]; then
  echo "Error: Missing argument. Please provide folder_to_check."
  echo "Example: $0 ios"
else
  # Check differences for the specified folder and set the checksum
  folder_to_check="$1"
  set_cache_envs "$folder_to_check"
fi