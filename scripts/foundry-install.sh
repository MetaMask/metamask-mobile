#!/bin/bash
set -ex

echo "Installing Foundry..."
curl -L https://foundry.paradigm.xyz | bash

# Run foundryup to install latest version
$HOME/.foundry/bin/foundryup

# Add to PATH for this step and future steps
echo 'export PATH="$HOME/.foundry/bin:$PATH"' >> $BASH_ENV
export PATH="$HOME/.foundry/bin:$PATH"
source $BASH_ENV

# Verify installation
if command -v forge &>/dev/null; then
    echo "Foundry installed successfully!"
    forge --version
else
    echo "Error: Foundry install failed"
    exit 1
fi

# Check anvil
if command -v anvil &>/dev/null; then
    anvil --version
else
    echo "anvil not found in PATH"
    exit 1
fi

if command -v gh &>/dev/null; then
    if [ -n "$GITHUB_ACCESS_TOKEN" ]; then
        echo "Setting GH_TOKEN..."
        export GH_TOKEN="$GITHUB_ACCESS_TOKEN"
    fi

    echo "Verifying forge binary..."
    if ! gh attestation verify --owner foundry-rs "$(which forge)"; then
        echo "Verification failed, continuing..."
    fi
else
    echo "GitHub CLI not installed, skipping attestation"
fi

echo "Script completed. Foundry and anvil are ready."
