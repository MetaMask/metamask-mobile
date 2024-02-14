#!/bin/bash
# Get the operating system name
os_name=$(uname -s)
echo "Operating system: $os_name"

# Check if the OS is macOS
if [ "$os_name" == "Darwin" ]; then
  # Set up ccache configuration for iOS
  ccache --config-path "$(pwd)/ccache.conf"
fi
# Set up ccache configuration
ccache --set-config cache_dir="$(pwd)/ccache"

# Source ccache configuration
source ./ccache.conf

# Print ccache statistics
ccache -p
