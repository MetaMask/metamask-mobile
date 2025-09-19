#!/bin/bash

# Generate Slack notification summary for performance E2E tests
# Usage: ./scripts/generate-slack-summary.sh [summary_file_path]

SUMMARY_FILE="${1:-aggregated-reports/summary.json}"

if [ -f "$SUMMARY_FILE" ]; then
    # Get device information matching main branch format
    androidDevices=$(jq -r '.platformDevices.Android[]? // empty' "$SUMMARY_FILE" | sed 's/+/ /g' | sed 's/\([^0-9]\)\([0-9][0-9]*\)/\1(\2)/g')
    iosDevices=$(jq -r '.platformDevices.iOS[]? // empty' "$SUMMARY_FILE" | sed 's/+/ /g' | sed 's/\([^0-9]\)\([0-9][0-9]*\)/\1(\2)/g')
    
    # Count devices
    androidCount=$(jq -r '.platformDevices.Android | length' "$SUMMARY_FILE")
    iosCount=$(jq -r '.platformDevices.iOS | length' "$SUMMARY_FILE")
    totalDevices=$((androidCount + iosCount))
    
    # Determine test results status by checking job statuses via GitHub API
    if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_RUN_ID" ]; then
        
        # Get all job statuses
        jobStatuses=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
            "https://api.github.com/repos/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID/jobs" 2>/dev/null)
        
        if [ $? -eq 0 ] && [ -n "$jobStatuses" ]; then
            # Check individual platform job statuses
            androidOnboardingFailed=$(echo "$jobStatuses" | jq -r '.jobs[] | select(.name | contains("Android") and contains("Onboarding")) | .conclusion' | grep -c "failure" || echo "0")
            iosOnboardingFailed=$(echo "$jobStatuses" | jq -r '.jobs[] | select(.name | contains("iOS") and contains("Onboarding")) | .conclusion' | grep -c "failure" || echo "0")
            androidImportedWalletFailed=$(echo "$jobStatuses" | jq -r '.jobs[] | select(.name | contains("Android") and contains("Imported Wallet")) | .conclusion' | grep -c "failure" || echo "0")
            iosImportedWalletFailed=$(echo "$jobStatuses" | jq -r '.jobs[] | select(.name | contains("iOS") and contains("Imported Wallet")) | .conclusion' | grep -c "failure" || echo "0")
            
            # Set status for each platform and test type
            if [ "$androidOnboardingFailed" -gt 0 ]; then
                androidOnboardingStatus=":x: FAILED"
            else
                androidOnboardingStatus=":white_check_mark: PASSED"
            fi
            
            if [ "$iosOnboardingFailed" -gt 0 ]; then
                iosOnboardingStatus=":x: FAILED"
            else
                iosOnboardingStatus=":white_check_mark: PASSED"
            fi
            
            if [ "$androidImportedWalletFailed" -gt 0 ]; then
                androidImportedWalletStatus=":x: FAILED"
            else
                androidImportedWalletStatus=":white_check_mark: PASSED"
            fi
            
            if [ "$iosImportedWalletFailed" -gt 0 ]; then
                iosImportedWalletStatus=":x: FAILED"
            else
                iosImportedWalletStatus=":white_check_mark: PASSED"
            fi
        else
            # Fallback if API call fails
            androidOnboardingStatus=":question: UNKNOWN"
            iosOnboardingStatus=":question: UNKNOWN"
            androidImportedWalletStatus=":question: UNKNOWN"
            iosImportedWalletStatus=":question: UNKNOWN"
        fi
    else
        # Fallback: check for test failure indicators in files
        if [ -d "test-results" ] && find test-results -name "*.json" -exec grep -l '"testFailed": true' {} \; | grep -q .; then
            androidOnboardingStatus=":x: FAILED"
            iosOnboardingStatus=":x: FAILED"
            androidImportedWalletStatus=":x: FAILED"
            iosImportedWalletStatus=":x: FAILED"
        else
            androidOnboardingStatus=":white_check_mark: PASSED"
            iosOnboardingStatus=":white_check_mark: PASSED"
            androidImportedWalletStatus=":white_check_mark: PASSED"
            iosImportedWalletStatus=":white_check_mark: PASSED"
        fi
    fi
    
    # Create formatted summary matching main branch format
    SUMMARY="*Performance E2E Tests*\n\n"
    
    SUMMARY+="---------------\n\n"
    SUMMARY+="*Devices Tested:*\n"
    if [ "$androidCount" -gt 0 ]; then
        SUMMARY+="• Android:\n"
        while IFS= read -r device; do
            if [ -n "$device" ]; then
                SUMMARY+="  • $device\n"
            fi
        done <<< "$androidDevices"
    fi
    if [ "$iosCount" -gt 0 ]; then
        SUMMARY+="• iOS:\n"
        while IFS= read -r device; do
            if [ -n "$device" ]; then
                SUMMARY+="  • $device\n"
            fi
        done <<< "$iosDevices"
    fi
    SUMMARY+="\n"
    SUMMARY+="---------------\n\n"
    SUMMARY+="*Test Results:*\n"
    SUMMARY+="• Onboarding Performance Tests:\n"
    SUMMARY+="  • Android: $androidOnboardingStatus\n"
    SUMMARY+="  • iOS: $iosOnboardingStatus\n"
    SUMMARY+="• Imported Wallet Performance Tests:\n"
    SUMMARY+="  • Android: $androidImportedWalletStatus\n"
    SUMMARY+="  • iOS: $iosImportedWalletStatus\n\n"
    SUMMARY+="---------------\n\n"
    SUMMARY+="*Build Info:*\n"
    SUMMARY+="• Commit Hash: \`$GITHUB_SHA\`\n"
    SUMMARY+="• Branch: \`$GITHUB_REF_NAME\`\n"
    SUMMARY+="---------------\n\n"
    SUMMARY+="<$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID|View Full Results>"
    
    echo "$SUMMARY"
else
    echo "Performance E2E Tests"
    echo "---------------"
    echo "No test results available"
fi
