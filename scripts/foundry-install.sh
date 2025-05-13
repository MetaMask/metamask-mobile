#!/bin/bash

set -e

echo "Installing Foundry..."
curl -L https://foundry.paradigm.xyz | bash

source ~/.bashrc 2>/dev/null || source ~/.zshrc 2>/dev/null || source ~/.bash_profile 2>/dev/null || true

echo "Running foundryup to install the latest version..."
foundryup

gh attestation verify --owner foundry-rs $(which forge)
