#!/bin/bash
# Updates the default E2E fixture from the generated report.
# Run this after executing the fixture-validation.spec.ts test locally.

set -e

REPORT_FILE="tests/reports/updated-default-fixture.json"
TARGET_FILE="tests/framework/fixtures/json/default-fixture.json"

if [ ! -f "$REPORT_FILE" ]; then
  echo "Error: $REPORT_FILE not found."
  echo "Run the fixture validation test first:"
  echo "  yarn detox test tests/regression/fixtures/fixture-validation.spec.ts -c <config>"
  exit 1
fi

cp "$REPORT_FILE" "$TARGET_FILE"
echo "Updated $TARGET_FILE from $REPORT_FILE"
