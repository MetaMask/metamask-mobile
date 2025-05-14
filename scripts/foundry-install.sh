#!/bin/bash

# We'll handle errors manually instead of exiting immediately
set +e

echo "Installing Foundry..."
curl -L https://foundry.paradigm.xyz | bash

# Explicitly add Foundry to PATH in multiple places to ensure it's available
export PATH="$PATH:$HOME/.foundry/bin"

# Find where foundryup is located
FOUNDRYUP_PATH=$(find $HOME -name foundryup -type f 2>/dev/null | head -n 1)
if [ -n "$FOUNDRYUP_PATH" ]; then
  echo "Found foundryup at: $FOUNDRYUP_PATH"
  FOUNDRY_BIN_DIR=$(dirname "$FOUNDRYUP_PATH")
  export PATH="$PATH:$FOUNDRY_BIN_DIR"
fi

if [ -f "$HOME/.bashrc" ]; then
  source "$HOME/.bashrc"
elif [ -f "$HOME/.zshrc" ]; then
  source "$HOME/.zshrc"
elif [ -f "$HOME/.bash_profile" ]; then
  source "$HOME/.bash_profile"
fi

echo "Running foundryup to install the latest version..."
$HOME/.foundry/bin/foundryup

# Verify ALL Foundry tools are installed
echo "Verifying Foundry installation..."
MISSING_TOOLS=""

if ! command -v forge &> /dev/null; then
  MISSING_TOOLS="$MISSING_TOOLS forge"
fi

if ! command -v cast &> /dev/null; then
  MISSING_TOOLS="$MISSING_TOOLS cast"
fi

if ! command -v anvil &> /dev/null; then
  MISSING_TOOLS="$MISSING_TOOLS anvil"
fi

if [ -n "$MISSING_TOOLS" ]; then
  echo "Error: The following Foundry tools are missing: $MISSING_TOOLS"
  
  # Try to find them manually
  echo "Searching for Foundry binaries in home directory..."
  find $HOME -name "anvil" -type f 2>/dev/null
  find $HOME -name "forge" -type f 2>/dev/null
  find $HOME -name "cast" -type f 2>/dev/null
  
  # If we found anvil, add its directory to PATH
  ANVIL_PATH=$(find $HOME -name anvil -type f 2>/dev/null | head -n 1)
  if [ -n "$ANVIL_PATH" ]; then
    echo "Found anvil at: $ANVIL_PATH"
    ANVIL_DIR=$(dirname "$ANVIL_PATH")
    echo "Adding $ANVIL_DIR to PATH"
    export PATH="$PATH:$ANVIL_DIR"
    echo "Checking if anvil is now available..."
    if command -v anvil &> /dev/null; then
      echo "anvil is now available!"
    else
      echo "anvil is still not in PATH despite adding its directory."
    fi
  else
    echo "Could not find anvil binary anywhere in home directory!"
  fi
  
  # Create symlinks in /usr/local/bin if needed
  echo "Creating symlinks to Foundry binaries in /usr/local/bin..."
  for TOOL in forge cast anvil; do
    TOOL_PATH=$(find $HOME -name $TOOL -type f 2>/dev/null | head -n 1)
    if [ -n "$TOOL_PATH" ]; then
      echo "Found $TOOL at: $TOOL_PATH"
      sudo ln -sf "$TOOL_PATH" /usr/local/bin/$TOOL
      echo "Created symlink in /usr/local/bin/$TOOL"
    else
      echo "Could not find $TOOL binary!"
    fi
  done
  
  # Final verification
  if ! command -v anvil &> /dev/null; then
    echo "ERROR: anvil is still not available after installation and PATH modifications."
    echo "PATH is currently: $PATH"
    exit 1
  fi
else
  echo "All Foundry tools are properly installed!"
  forge --version
  cast --version
  anvil --version
fi

# Create a simple script to ensure PATH is set correctly in other scripts/processes
cat > $HOME/use_foundry.sh << 'EOF'
#!/bin/bash
export PATH="$PATH:$HOME/.foundry/bin"

# Try to find Foundry binaries if not in standard location
if ! command -v anvil &> /dev/null; then
  ANVIL_PATH=$(find $HOME -name anvil -type f 2>/dev/null | head -n 1)
  if [ -n "$ANVIL_PATH" ]; then
    export PATH="$PATH:$(dirname $ANVIL_PATH)"
  fi
fi

# Execute the original command with updated PATH
exec "$@"
EOF

chmod +x $HOME/use_foundry.sh
echo "Created helper script at $HOME/use_foundry.sh to ensure correct PATH"
echo "Use it like: $HOME/use_foundry.sh your-command"

echo "✅ Script completed successfully. Foundry tools should be ready to use."

anvil --fork-url https://eth.merkle.io