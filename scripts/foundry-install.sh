#!/bin/bash

set -e

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
  echo "Installing GitHub CLI..."

  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Install GitHub CLI on Linux
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg |
      sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" |
      sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt update
    sudo apt install gh -y

  elif [[ "$OSTYPE" == "darwin"* ]]; then
    # Install GitHub CLI on macOS
    brew install gh

  else
    echo "Unsupported operating system for automatic GitHub CLI installation."
    exit 1
  fi

  echo "GitHub CLI installed successfully!"
else
  echo "GitHub CLI is already installed."
fi

# Authenticate using GITHUB_TOKEN if available
if [ -n "$GITHUB_TOKEN" ]; then
  echo "Setting up GitHub CLI authentication using GITHUB_TOKEN..."
  echo "$GITHUB_TOKEN" | gh auth login --with-token
else
  echo "Warning: GITHUB_TOKEN environment variable not set."
fi
