#!/usr/bin/env bash
# Delete old MetaMask APKs from TestMu AI real-device app storage.
#
# Only apps whose custom_id starts with metamask-android-with-srp- or
# metamask-android-without-srp- (the ids upload-testmu-app.sh creates) and whose
# updated_at is older than the retention window are deleted. Apps without a
# parseable updated_at are never deleted.
#
# Usage: LT_USERNAME=... LT_ACCESS_KEY=... ./.github/scripts/qa-automation/performance-tests/cleanup-testmu-apps.sh [--dry-run]
#
# Optional env:
#   TESTMU_APP_RETENTION_DAYS   default 3
#   TESTMU_CLEANUP_PAGE_LIMIT   default 100
#   TESTMU_CLEANUP_MAX_PAGES    default 50
#   TESTMU_CLEANUP_BATCH_SIZE   default 50
#   TESTMU_CLEANUP_NOW          epoch seconds override (tests)
set -euo pipefail

DRY_RUN=false
case "${1:-}" in
  "") ;;
  --dry-run) DRY_RUN=true ;;
  *)
    echo "Usage: $0 [--dry-run]" >&2
    exit 2
    ;;
esac

LT_USERNAME="${LT_USERNAME:?LT_USERNAME is required}"
LT_ACCESS_KEY="${LT_ACCESS_KEY:?LT_ACCESS_KEY is required}"
RETENTION_DAYS="${TESTMU_APP_RETENTION_DAYS:-3}"
PAGE_LIMIT="${TESTMU_CLEANUP_PAGE_LIMIT:-100}"
MAX_PAGES="${TESTMU_CLEANUP_MAX_PAGES:-50}"
BATCH_SIZE="${TESTMU_CLEANUP_BATCH_SIZE:-50}"
API_BASE="https://manual-api.lambdatest.com"

for value in "$RETENTION_DAYS" "$PAGE_LIMIT" "$MAX_PAGES" "$BATCH_SIZE"; do
  if ! [[ "$value" =~ ^[1-9][0-9]*$ ]]; then
    echo "Invalid numeric setting: $value" >&2
    exit 2
  fi
done

NOW="${TESTMU_CLEANUP_NOW:-$(date -u +%s)}"
CUTOFF=$((NOW - RETENTION_DAYS * 86400))

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/testmu-cleanup.XXXXXX")"
trap 'rm -rf "$WORK_DIR"' EXIT
SEEN_IDS="$WORK_DIR/seen.txt"
CANDIDATES="$WORK_DIR/candidates.txt"
: > "$SEEN_IDS"
: > "$CANDIDATES"

# List every page before deleting anything so deletions cannot shift offsets.
offset=0
listed=0
for ((page = 1; page <= MAX_PAGES; page++)); do
  response="$(
    curl -fsS -u "$LT_USERNAME:$LT_ACCESS_KEY" \
      "$API_BASE/app/data?type=android&level=user&limit=$PAGE_LIMIT&offset=$offset"
  )"

  page_ids="$WORK_DIR/page-ids.txt"
  jq -r '.data[]?.app_id // empty' <<<"$response" > "$page_ids"
  page_count="$(wc -l < "$page_ids" | tr -d ' ')"
  if [ "$page_count" -eq 0 ]; then
    break
  fi

  # Guard against an API that ignores offset and keeps returning page one.
  new_ids="$(grep -vxFf "$SEEN_IDS" "$page_ids" | wc -l | tr -d ' ' || true)"
  if [ "$new_ids" -eq 0 ]; then
    echo "Page at offset $offset returned no new apps; stopping pagination." >&2
    break
  fi
  cat "$page_ids" >> "$SEEN_IDS"
  listed=$((listed + page_count))

  jq -r --argjson cutoff "$CUTOFF" '
    .data[]?
    | select(
        (.custom_id // .customId // .name // "")
        | test("^metamask-android-(with|without)-srp-")
      )
    | select(
        try (
          (.updated_at | sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601) < $cutoff
        ) catch false
      )
    | .app_id
  ' <<<"$response" >> "$CANDIDATES"

  total="$(jq -r '.metaData.total // 0' <<<"$response")"
  offset=$((offset + page_count))
  if [ "$offset" -ge "$total" ]; then
    break
  fi
done

matched="$(wc -l < "$CANDIDATES" | tr -d ' ')"
echo "TestMu apps listed: $listed; older than ${RETENTION_DAYS}d and matching MetaMask ids: $matched"

if [ "$matched" -eq 0 ]; then
  exit 0
fi

if [ "$DRY_RUN" = "true" ]; then
  echo "Dry run: would delete these app ids:"
  cat "$CANDIDATES"
  exit 0
fi

split -l "$BATCH_SIZE" "$CANDIDATES" "$WORK_DIR/batch-"
deleted=0
failed=0
for batch in "$WORK_DIR"/batch-*; do
  batch_count="$(wc -l < "$batch" | tr -d ' ')"
  body="$(jq -cRn '[inputs] | {appIds: join(",")}' < "$batch")"
  if curl -fsS -u "$LT_USERNAME:$LT_ACCESS_KEY" \
    -X DELETE -H 'Content-Type: application/json' \
    --data "$body" "$API_BASE/app/delete" > /dev/null; then
    deleted=$((deleted + batch_count))
  else
    echo "Failed to delete a batch of $batch_count apps" >&2
    failed=$((failed + batch_count))
  fi
done

echo "TestMu cleanup done: deleted $deleted, failed $failed"
[ "$failed" -eq 0 ]
