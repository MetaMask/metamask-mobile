#!/bin/bash

_PATH="./android/app/build/outputs/apk/release"
_FILE="$PATH/app-release.apk"

if test -f \"$FILE\"; then
  shasum -a 512 \"$FILE\" > "$FILE/sha512sums.txt"
fi;
