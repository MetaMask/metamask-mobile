#!/usr/bin/env bash

set -u
set -o pipefail

# yarn audit --level moderate --groups dependencies
# use `improved-yarn-audit` since that allows for exclude
# exclude `ws` until we can come up with a better solution
yarn run improved-yarn-audit --ignore-dev-deps --min-severity moderate --exclude 1005099
audit_status="$?"

# Use a bitmask to ignore INFO and LOW severity audit results
# See here: https://yarnpkg.com/lang/en/docs/cli/audit/
audit_status="$(( audit_status & 11100 ))"

if [[ "$audit_status" != 0 ]]
then
    count="$(yarn audit --level moderate --groups dependencies --json | tail -1 | jq '.data.vulnerabilities.moderate + .data.vulnerabilities.high + .data.vulnerabilities.critical')"
    printf "✘ Audit shows %s moderate or high severity advisories _in the production dependencies_\n" "$count"
    exit 1
else
    printf "✔ Audit shows _zero_ moderate or high severity advisories _in the production dependencies_\n"
fi
