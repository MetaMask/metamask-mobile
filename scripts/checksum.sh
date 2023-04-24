#!/bin/bash
MODE=$1
BASE_PATH="./android/app/build/outputs/apk"
SHA_FILE="sha512sums.txt"

case "$MODE" in
  "QA")
    DIR="qa/release"
    ;;
  "flask")
    DIR="flask/release"
    ;;
  *)
    DIR="prod/release"
    MODE="prod" 
    ;;
esac

<<<<<<< HEAD
# Convert MODE to lowercase
MODE_LOWERCASE=$(echo "$MODE" | tr '[:upper:]' '[:lower:]')

FILE="${BASE_PATH}/${DIR}/app-${MODE_LOWERCASE}-release.apk"
OUTPUT_FILE="${BASE_PATH}/${DIR}/${SHA_FILE}"
=======
  if test -f "$FILE"; then
    shasum -a 512 "$FILE" > ./android/app/build/outputs/apk/qa/release/sha512sums.txt
  fi
elif [ "$MODE" == "Flask" ]; then
FILE=./android/app/build/outputs/apk/flask/release/app-flask-release.apk

  if test -f "$FILE"; then
    shasum -a 512 "$FILE" > ./android/app/build/outputs/apk/flask/release/sha512sums.txt
  fi
else
FILE=./android/app/build/outputs/apk/prod/release/app-prod-release.apk

  if test -f "$FILE"; then
    shasum -a 512 "$FILE" > ./android/app/build/outputs/apk/prod/release/sha512sums.txt
  fi
>>>>>>> 814c1c8d3 (Mobile snaps)

if test -f "$FILE"; then
  shasum -a 512 "$FILE" > "$OUTPUT_FILE"
fi