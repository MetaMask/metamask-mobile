#!/usr/bin/env bash
# Usage: scripts/namespace-benchmark.sh [hours-ago]
# Prints median + p95 wall-clock per job for current vs namespace shadow
# over the last N hours (default 24).

set -euo pipefail

HOURS=${1:-24}
REPO=MetaMask/metamask-mobile

# macOS date vs GNU date
if date -v-1H +%s >/dev/null 2>&1; then
  SINCE=$(date -u -v-${HOURS}H +%Y-%m-%dT%H:%M:%SZ)
else
  SINCE=$(date -u -d "${HOURS} hours ago" +%Y-%m-%dT%H:%M:%SZ)
fi

echo "Comparing runs since ${SINCE} (last ${HOURS}h)"
echo

for WF in ci.yml ci-namespace-shadow.yml; do
  echo "=== ${WF} ==="

  gh run list --repo "${REPO}" --workflow "${WF}" --status success --limit 100 \
    --json databaseId,createdAt \
    --jq "[.[] | select(.createdAt >= \"${SINCE}\")] | length" \
  | xargs -I{} echo "  Successful runs in window: {}"

  gh run list --repo "${REPO}" --workflow "${WF}" --status success --limit 100 \
    --json databaseId,createdAt \
    --jq "[.[] | select(.createdAt >= \"${SINCE}\") | .databaseId][]" \
  | while read -r RUN_ID; do
      gh run view "${RUN_ID}" --repo "${REPO}" --json jobs \
        --jq '.jobs[] | select(.conclusion == "success" and .startedAt != "0001-01-01T00:00:00Z" and .completedAt != "0001-01-01T00:00:00Z") | [.name, ((.completedAt[:19] | strptime("%Y-%m-%dT%H:%M:%S") | mktime) - (.startedAt[:19] | strptime("%Y-%m-%dT%H:%M:%S") | mktime))] | @tsv' 2>/dev/null
    done \
  | awk -F'\t' '
      { sum[$1]+=$2; n[$1]++; data[$1]=data[$1]" "$2 }
      END {
        for (j in sum) {
          split(data[j], arr, " ")
          asort(arr)
          k=n[j]
          p50=arr[int(k*0.5)+1]
          p95=arr[int(k*0.95)+1]
          printf "  %-55s n=%-4d p50=%6.0fs  p95=%6.0fs\n", j, k, p50, p95
        }
      }
    ' \
  | sort

  echo
done
