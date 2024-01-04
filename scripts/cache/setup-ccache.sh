#!/bin/bash

# Set up ccache configuration
ccache --config-path "$(pwd)/ccache.conf"
ccache --set-config cache_dir="$(pwd)/ccache"

# Source ccache configuration
source ./ccache.conf

# Print ccache statistics
ccache -p
