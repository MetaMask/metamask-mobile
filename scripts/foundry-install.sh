#!/bin/bash

set -e

echo "Installing Foundry..."
curl -L https://foundry.paradigm.xyz | bash

# Add Foundry binaries to PATH for *this step*
export PATH="$HOME/.foundry/bin:$PATH"

echo "Running foundryup to install the latest version..."
$HOME/.foundry/bin/foundryup

# Save path to Bitrise environment for use in future steps
envman add --key FOUNDRY_BIN_PATH --value "$HOME/.foundry/bin"

# Verify installation
if command -v forge &>/dev/null; then
    echo "Foundry installation completed successfully!"
    forge --version
else
    echo "Error: Foundry installation may have failed. Please check the output above."
    exit 1
fi

anvil --version

# GitHub attestation (optional)
if [ -n "$GITHUB_ACCESS_TOKEN" ]; then
    echo "Using GITHUB_ACCESS_TOKEN as GH_TOKEN for GitHub CLI authentication..."
    export GH_TOKEN="$GITHUB_ACCESS_TOKEN"
    gh attestation verify --owner foundry-rs $(which forge)
else
    echo "Warning: GITHUB_ACCESS_TOKEN environment variable not set."
fi

echo "Verifying forge binary using GitHub attestation..."
if gh attestation verify --owner foundry-rs $(which forge); then
    echo "Verification successful! The forge binary is authentic."
else
    VERIFICATION_STATUS=$?
    echo "Verification failed with exit code: $VERIFICATION_STATUS"
    echo "Since this is running in CI, we'll continue despite verification failure."
fi

echo "Script completed successfully. Foundry is ready to use."

anvil --version