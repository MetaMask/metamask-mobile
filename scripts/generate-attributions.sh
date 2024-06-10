#!/usr/bin/env bash

set -e
set -u
set -o pipefail

SCRIPT_DIRECTORY=$( cd "${BASH_SOURCE[0]%/*}" && pwd )
PROJECT_DIRECTORY=$( cd "${SCRIPT_DIRECTORY}" && cd ../ && pwd )

# Generate attributions
#
# Generate the file `attribution.txt`, which is a list of packages that we use
# along with their licenses. This should include only production dependencies.
main() {
  # Switching to the project directory explicitly, so that we can use paths
  # relative to the project root irrespective of where this script was run.
  cd "${PROJECT_DIRECTORY}"

  # To exclude `devDependencies`, we delete them from the manifest first, then
  # reinstall. We had to do this because we couldn't find a package that could
  # extract licences just from production dependencies that worked correctly
  # with Yarn v1. We also couldn't use `yarn install --prod` here because that
  # is also broken on Yarn v1, in that it still ends up installing some
  # packages from `devDependencies`.
  local tmp="package.json_temp"
  jq 'del(.devDependencies)' package.json > "$tmp"
  mv "$tmp" package.json

  rm -rf "${PROJECT_DIRECTORY}/node_modules"
  yarn --pure-lockfile

  cd "${PROJECT_DIRECTORY}/scripts/generate-attributions"

  # Install sub-project that just contains attribution generation package
  # so that it can be used without installing `devDependencies` in root.
  yarn setup

  yarn generate-attribution -o "${PROJECT_DIRECTORY}" -b "${PROJECT_DIRECTORY}"

  # Reset package.json
  cd "${PROJECT_DIRECTORY}"
  git checkout package.json

  # This condition is true when this script is run in an interactive shell
  # See https://serverfault.com/a/146747
  if [[ $- == *i* ]]; then
    echo "Re-run yarn setup to restore development dependencies"
  fi
}

main "$@"
