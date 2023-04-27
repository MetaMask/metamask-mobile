#!/bin/bash

MODE=$1

if [ "$MODE" == "QA" ]; then
FILE=./android/app/build/outputs/apk/qa/release/app-qa-release.apk

  if test -f "$FILE"; then
    shasum -a 512 "$FILE" > ./android/app/build/outputs/apk/qa/release/sha512sums.txt
  fi

else
FILE=./android/app/build/outputs/apk/prod/release/app-prod-release.apk

  if test -f "$FILE"; then
    shasum -a 512 "$FILE" > ./android/app/build/outputs/apk/prod/release/sha512sums.txt
  fi

fi