#!/bin/bash
yarn build:attribution

ATTRIBUTION_TXT="./attribution.txt";

# check to see if there's changed to ATTRIBUTION_TXT
if ! git diff --exit-code "$ATTRIBUTION_TXT"; then
  echo "attribution.txt has changed!"
  echo "run \`yarn build:attribution\` and commit changes."
  exit 1
fi
