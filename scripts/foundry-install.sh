#!/bin/bash

set -e

echo "Installing Foundry..."
curl -L https://foundry.paradigm.xyz | bash

export PATH="$PATH:$HOME/.foundry/bin"

if [ -f "$HOME/.bashrc" ]; then
    source "$HOME/.bashrc"
elif [ -f "$HOME/.zshrc" ]; then
    source "$HOME/.zshrc"
elif [ -f "$HOME/.bash_profile" ]; then
    source "$HOME/.bash_profile"
fi

echo "Running foundryup to install the latest version..."
$HOME/.foundry/bin/foundryup

# Verify installation
if command -v forge &> /dev/null; then
    echo "Foundry installation completed successfully!"
    forge --version
else
    echo "Error: Foundry installation may have failed. Please check the output above."
    exit 1
fi

if [ -n "$GITHUB_ACCESS_TOKEN" ]; then
    echo "Using GITHUB_ACCESS_TOKEN as GH_TOKEN for GitHub CLI authentication..."
    export GH_TOKEN="$GITHUB_ACCESS_TOKEN"
    gh attestation verify --owner foundry-rs $(which forge)

else
    echo "Warning: GITHUB_ACCESS_TOKEN environment variable not set."
fi
