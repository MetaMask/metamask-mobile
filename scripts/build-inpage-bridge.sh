#!/bin/bash
set -euo pipefail

rm -f app/core/InpageBridgeWeb3.js
mkdir -p scripts/inpage-bridge/dist && rm -rf scripts/inpage-bridge/dist/*
cd scripts/inpage-bridge/inpage
../../../node_modules/.bin/webpack --config webpack.config.js
cd ..
node content-script/build.js
cat dist/inpage-bundle.js content-script/index.js > dist/index-raw.js
../../node_modules/.bin/webpack --config webpack.config.js
cd ../..
cp scripts/inpage-bridge/dist/index.js app/core/InpageBridgeWeb3.js
cp scripts/inpage-bridge/dist/inpage-content.js app/core/InpageContentWeb3.js
