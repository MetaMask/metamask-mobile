#!/bin/bash
set -euo pipefail

rm -f app/core/InpageBridgeWeb3.js
mkdir -p scripts/inpage-bridge/dist && rm -rf scripts/inpage-bridge/dist/*
cd scripts/inpage-bridge/
../../node_modules/.bin/webpack --config webpack.config.js
cd ../..
cp scripts/inpage-bridge/dist/index.js app/core/InpageBridgeWeb3.js
