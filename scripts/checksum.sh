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

# Convert MODE to lowercase
MODE_LOWERCASE=$(echo "$MODE" | tr '[:upper:]' '[:lower:]')

FILE="${BASE_PATH}/${DIR}/app-${MODE_LOWERCASE}-release.apk"
OUTPUT_FILE="${BASE_PATH}/${DIR}/${SHA_FILE}"

if test -f "$FILE"; then
  shasum -a 512 "$FILE" > "$OUTPUT_FILE"
fi