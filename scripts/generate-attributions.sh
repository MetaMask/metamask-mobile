#!/usr/bin/env bash

set -e
set -u
set -o pipefail

tmp="package.json_temp"
# temp delete devDependencies since we don't distrubute those
jq 'del(.devDependencies)' package.json > "$tmp"
mv "$tmp" package.json
generate-attribution -o .
# reset package.json
git checkout package.json
