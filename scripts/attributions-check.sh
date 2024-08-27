#!/bin/bash
yarn build:attribution

ATTRIBUTIONS_FILE="./attribution.txt"

# check to see if there's changes on the attributions file
if ! git diff --exit-code "$ATTRIBUTIONS_FILE"; then
  echo "The set of attributions kept in \`attribution.txt\` are out of date."
  echo "Run \`yarn build:attribution\` to regenerate them and commit and push the changes."
  echo "If you're looking at a pull request, you can also post the comment \`@metamaskbot update-attributions\` and the file will be automatically regenerated for you."
  exit 1
fi
