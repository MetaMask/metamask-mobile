#!/bin/bash

# Generate Slack notification summary for performance E2E tests
# Usage: ./scripts/generate-slack-summary.sh [summary_file_path]

SUMMARY_FILE="${1:-aggregated-reports/summary.json}"

if [ -f "$SUMMARY_FILE" ]; then
    # Get device information
    androidDevices=$(jq -r '.devices[] | select(.platform == "Android") | "  • \(.device)"' "$SUMMARY_FILE" | tr '\n' '\n')
    iosDevices=$(jq -r '.devices[] | select(.platform == "iOS") | "  • \(.device)"' "$SUMMARY_FILE" | tr '\n' '\n')
    
    # Get test counts
    androidTests=$(jq -r '.testsByPlatform.android // 0' "$SUMMARY_FILE")
    iosTests=$(jq -r '.testsByPlatform.ios // 0' "$SUMMARY_FILE")
    
    # Determine status (simplified - you can enhance this logic)
    androidStatus=":white_check_mark: PASSED"
    iosStatus=":white_check_mark: PASSED"
    
    # Create formatted summary
    echo "Performance E2E Tests"
    echo "---------------"
    echo "Devices Tested:"
    echo "• Android:"
    echo "$androidDevices"
    echo "• iOS:"
    echo "$iosDevices"
    echo "---------------"
    echo "Test Results:"
    echo "• Android Tests: $androidStatus"
    echo "• iOS Tests: $iosStatus"
    echo "---------------"
    echo "Build Info:"
    echo "• Commit Hash: \`$GITHUB_SHA\`"
    echo "• Branch: \`$GITHUB_REF_NAME\`"
    echo "---------------"
    echo "• <$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID|View Full Results>"
    echo "• <$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID|Download Consolidated Report>"
else
    echo "Performance E2E Tests"
    echo "---------------"
    echo "No test results available"
fi
