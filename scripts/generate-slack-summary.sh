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
    
    # Get failed tests statistics
    totalFailedTests=$(jq -r '.failedTestsStats.totalFailedTests // 0' "$SUMMARY_FILE")
    teamsAffected=$(jq -r '.failedTestsStats.teamsAffected // 0' "$SUMMARY_FILE")
    
    # Determine test results status by checking job statuses via GitHub API
    if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_RUN_ID" ]; then
        
        # Get all job statuses
        jobStatuses=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
            "https://api.github.com/repos/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID/jobs" 2>/dev/null)
        
        if [ $? -eq 0 ] && [ -n "$jobStatuses" ]; then
            # Function to get job status for a specific platform and test type
            get_job_status() {
                local platform="$1"
                local test_type="$2"
                
                # Get job conclusion (failure, skipped, success, etc.)
                local conclusion=$(echo "$jobStatuses" | jq -r ".jobs[] | select(.name | contains(\"$platform\") and contains(\"$test_type\")) | .conclusion" | head -1)
                
                # Check if job exists at all
                local exists=$(echo "$jobStatuses" | jq -r ".jobs[] | select(.name | contains(\"$platform\") and contains(\"$test_type\")) | .name" | wc -l)
                
                if [ "$conclusion" = "failure" ]; then
                    echo ":x: FAILED"
                elif [ "$conclusion" = "skipped" ] || [ "$exists" -eq 0 ]; then
                    echo ":fast_forward: SKIPPED"
                else
                    echo ":white_check_mark: PASSED"
                fi
            }
            
            # Get status for each platform and test type
            androidOnboardingStatus=$(get_job_status "Android" "Onboarding")
            iosOnboardingStatus=$(get_job_status "iOS" "Onboarding")
            androidImportedWalletStatus=$(get_job_status "Android" "Imported Wallet")
            iosImportedWalletStatus=$(get_job_status "iOS" "Imported Wallet")
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
    
    # Function to add device list for a platform
    add_device_list() {
        local platform="$1"
        local devices="$2"
        local count="$3"
        
        if [ "$count" -gt 0 ]; then
            SUMMARY+="• $platform:\n"
            while IFS= read -r device; do
                if [ -n "$device" ]; then
                    SUMMARY+="  • $device\n"
                fi
            done <<< "$devices"
        fi
    }
    
    add_device_list "Android" "$androidDevices" "$androidCount"
    add_device_list "iOS" "$iosDevices" "$iosCount"
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
    
    # Add failed tests by team section if there are failures
    if [ "$totalFailedTests" -gt 0 ]; then
        SUMMARY+="*:rotating_light: Failed Tests by Team:*\n"
        SUMMARY+="_${totalFailedTests} test(s) failed across ${teamsAffected} team(s)_\n\n"
        
        # Get all team IDs that have failed tests
        teamIds=$(jq -r '.failedTestsStats.failedTestsByTeam | keys[]' "$SUMMARY_FILE" 2>/dev/null)
        
        for teamId in $teamIds; do
            # Get team info including the proper Slack mention format
            teamName=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].team.teamName // \"Unknown Team\"" "$SUMMARY_FILE")
            slackMention=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].team.slackMention // \"$teamId\"" "$SUMMARY_FILE")
            failedCount=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].tests | length" "$SUMMARY_FILE")
            
            # Add team header with proper Slack mention (<!subteam^ID|name> format)
            SUMMARY+="• *${teamName}* ${slackMention} - ${failedCount} failed test(s):\n"
            
            # List each failed test for this team
            failedTests=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].tests[] | \"  → \(.testName) [\(.platform)/\(.device)]\"" "$SUMMARY_FILE" 2>/dev/null)
            while IFS= read -r testLine; do
                if [ -n "$testLine" ]; then
                    SUMMARY+="${testLine}\n"
                fi
            done <<< "$failedTests"
            SUMMARY+="\n"
        done
        
        SUMMARY+="---------------\n\n"
    fi
    
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
