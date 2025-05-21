#!/bin/bash
if [ ! -f "node_modules/.bin/anvil" ]; then
  echo "anvil not found in node_modules/.bin, installing foundryup..."
  yarn  mm-foundryup
else
  echo "anvil already installed. Skipping  mm-foundryup install."
fi