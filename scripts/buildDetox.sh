#!/bin/bash

# Source environment variables
source .js.env

if [ "$1" == "ios" ]; then
    IS_TEST='true' detox build -c ios.sim.debug
elif [ "$1" == "android" ]; then
    IS_TEST='true' detox build -c android.emu.debug
else
    echo "Invalid platform specified. Please use 'ios' or 'android'."
    exit 1
fi