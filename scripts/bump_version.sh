#!/usr/bin/env bash

set -e
set -u
set -o pipefail

versionName="$(awk '/VERSION_NAME: /{print $2}' bitrise.yml)"
echo $versionName


awk -v versionName="$versionName" '{split($0 ~ versionName, t, ".")}' 