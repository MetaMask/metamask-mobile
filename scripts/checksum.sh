#!/bin/bash

FILE=./android/app/build/outputs/apk/release/app-release.apk

if test -f "$FILE"; then
  shasum -a 512 "$FILE" > ./android/app/build/outputs/apk/release/sha512sums.txt
fi;
