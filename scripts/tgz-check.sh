#!/bin/bash
if [[ $(ls | grep .tgz) ]]; then
    echo "✘ there is a tgz file! you'll want to delete this before you can merge"
    exit 1
else
    echo "✔ no tgz file found"
    exit 0
fi
