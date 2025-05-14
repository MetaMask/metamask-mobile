#!/bin/bash
# Using bash explicitly for this script's execution.

set -e # Exit immediately if a command exits with a non-zero status.
set -x # Print commands and their arguments as they are executed.

echo "Starting Foundry installation process..."

# Ensure the .foundry directory exists if needed by the installer
mkdir -p "$HOME/.foundry/bin"

# Add Foundry to PATH for the current script execution
# This ensures that even if sourcing fails or doesn't pick up immediately,
# commands within this script can find foundry binaries.
ORIGINAL_PATH=$PATH
export PATH="$HOME/.foundry/bin:$PATH"
echo "Temporarily updated PATH for this script: $PATH"

echo "Downloading and running Foundry installer (foundryup)..."
# The installer (curl ... | bash) will detect the shell (zsh in this case)
# and attempt to modify the appropriate rc/env file (e.g., .zshenv).
# It also typically runs foundryup for the first time.
curl -L https://foundry.paradigm.xyz | bash

echo "Foundry installer script finished."
echo "Attempting to source shell configuration files to reflect changes in current session..."

# Attempt to source the shell configuration file that Foundry likely updated.
# This is to make foundry commands available if the installer modified PATH in a config file.
# .zshenv is mentioned by the Bitrise output for zsh.
# Check if we are in Zsh or Bash to source appropriately
CURRENT_SHELL=$(ps -p $$ -o comm=)
echo "Current script interpreter: $CURRENT_SHELL"
echo "Attempting to source .zshenv first if it exists, as per Bitrise logs..."
if [ -f "$HOME/.zshenv" ]; then
    echo "Sourcing $HOME/.zshenv..."
    . "$HOME/.zshenv" # Use . (dot command) for POSIX compatibility to source in current shell
elif [ -f "$HOME/.zshrc" ]; then # Fallback for zsh
    echo "Sourcing $HOME/.zshrc..."
    . "$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then # For bash
    echo "Sourcing $HOME/.bashrc..."
    . "$HOME/.bashrc"
elif [ -f "$HOME/.bash_profile" ]; then # Fallback for bash login shells
    echo "Sourcing $HOME/.bash_profile..."
    . "$HOME/.bash_profile"
else
    echo "No standard shell configuration files (.zshenv, .zshrc, .bashrc, .bash_profile) found to source."
fi

echo "PATH after attempting to source config files: $PATH"

# Run foundryup again to ensure it's the latest version and also to test if it's in PATH.
echo "Running 'foundryup' to ensure the latest version and test PATH..."
if command -v foundryup &> /dev/null; then
    foundryup
else
    echo "'foundryup' command not found in PATH after installer and sourcing attempts. This is unexpected."
    echo "Will try to proceed with full path if forge verification fails."
fi

echo "Verifying 'forge' command availability..."
if command -v forge &> /dev/null; then
    echo "Foundry (forge) is now available in PATH."
    forge --version
    echo "Foundry installation and setup completed successfully!"
else
    echo "Error: Foundry (forge) still not found in PATH after all attempts."
    echo "Final PATH: $PATH"
    # Listing contents of .foundry/bin for diagnostics
    if [ -d "$HOME/.foundry/bin" ]; then
        echo "Contents of $HOME/.foundry/bin:"
        ls -la "$HOME/.foundry/bin"
    fi
    exit 1
fi

anvil --version
if [ -n "$GITHUB_ACCESS_TOKEN" ]; then
    echo "Using GITHUB_ACCESS_TOKEN as GH_TOKEN for GitHub CLI authentication..."
    export GH_TOKEN="$GITHUB_ACCESS_TOKEN"
    gh attestation verify --owner foundry-rs $(which forge)

else
    echo "Warning: GITHUB_ACCESS_TOKEN environment variable not set."
fi
