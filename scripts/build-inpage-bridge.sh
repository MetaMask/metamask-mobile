#!/bin/bash
rm app/core/InpageBridgeWeb3.js
mkdir -p js/dist && rm -rf js/dist/*
cd js/inpage
../../node_modules/.bin/webpack --config webpack.config.js
cd ..
node content-script/build.js
cat dist/inpage-bundle.js content-script/index.js > dist/index-raw.js
../node_modules/.bin/webpack --config webpack.config.js
cd ..
cp js/dist/index.js app/core/InpageBridgeWeb3.js
