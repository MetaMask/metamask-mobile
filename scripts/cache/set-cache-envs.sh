# Script to leverage the usage of ccache in the pipeline
# Check differences for a given folder and save the checksum as CCACHE_KEY
set_cache_envs() {
  local folder="$1"
  local prefix_ccache_key="ccache-$folder"

  # Generate a checksum for the native dependencies and set it as CCACHE_KEY
  local checksum=$(find "$folder" -type f -exec sha512sum {} \; | sha512sum | awk '{print $1}')
  echo "Checksum: $checksum"
  envman add --key CCACHE_KEY --value "$prefix_ccache_key-$checksum"
  echo "CCACHE_KEY set to $prefix_ccache_key-$checksum"
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