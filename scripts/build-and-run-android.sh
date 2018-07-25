#!/bin/bash

# 1. Copy entry.js file to android assets dir
cp ./app/entry.js ./android/app/src/main/assets/entry.js
# 2. Build and run
react-native run-android
