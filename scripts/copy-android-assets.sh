# Copy JS files for injection
yes | cp -rf app/core/InpageBridge.js android/app/src/main/assets/.
yes | cp -rf app/core/InpageBridgeWeb3.js android/app/src/main/assets/.
# Copy fonts with iconset
yes | cp -rf ./app/fonts/Metamask.ttf ./android/app/src/main/assets/fonts/Metamask.ttf

