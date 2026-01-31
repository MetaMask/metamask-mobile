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
    
    # Add failed tests section if there are failures
    if [ "$totalFailedTests" -gt 0 ]; then
        SUMMARY+="*:rotating_light: Failed Tests (${totalFailedTests}):*\n\n"
        
        # Get all team IDs that have failed tests
        teamIds=$(jq -r '.failedTestsStats.failedTestsByTeam | keys[]' "$SUMMARY_FILE" 2>/dev/null)
        
        for teamId in $teamIds; do
            # Get team info including the proper Slack mention format
            teamName=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].team.teamName // \"Unknown Team\"" "$SUMMARY_FILE")
            slackMention=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].team.slackMention // \"$teamId\"" "$SUMMARY_FILE")
            
            # List each failed test for this team
            testCount=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].tests | length" "$SUMMARY_FILE")
            
            for ((i=0; i<testCount; i++)); do
                testName=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].tests[$i].testName" "$SUMMARY_FILE")
                testFilePath=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].tests[$i].testFilePath // \"unknown\"" "$SUMMARY_FILE")
                platform=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].tests[$i].platform" "$SUMMARY_FILE")
                device=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].tests[$i].device" "$SUMMARY_FILE")
                failureReason=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].tests[$i].failureReason // \"unknown\"" "$SUMMARY_FILE")
                
                # Extract just the filename from the path
                testFile=$(basename "$testFilePath" 2>/dev/null || echo "$testFilePath")
                
                # Format the device (remove + and clean up)
                deviceDisplay=$(echo "$device" | sed 's/+/ /g')
                
                # Format the failure reason for display
                case "$failureReason" in
                    "quality_gates_exceeded")
                        reasonDisplay="Quality Gates Exceeded"
                        ;;
                    "timedOut")
                        reasonDisplay="Test Timed Out"
                        ;;
                    "test_error"|"failed")
                        reasonDisplay="Test Error"
                        ;;
                    *)
                        reasonDisplay="$failureReason"
                        ;;
                esac
                
                # Output the test failure info in the requested format
                SUMMARY+=":x: *Test failed:* \`${testFile}\`\n"
                SUMMARY+="• *Device:* ${platform} - ${deviceDisplay}\n"
                SUMMARY+="• *Team:* ${slackMention}\n"
                SUMMARY+="• *Reason:* ${reasonDisplay}\n"
                
                # Check if this test has quality gates violations - show the table
                hasViolations=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].tests[$i].qualityGatesViolations | length // 0" "$SUMMARY_FILE" 2>/dev/null)
                
                if [ "$hasViolations" != "null" ] && [ "$hasViolations" -gt 0 ]; then
                    SUMMARY+="\`\`\`\n"
                    SUMMARY+="Step                     | Actual    | Expected  | Exceeded\n"
                    SUMMARY+="-------------------------|-----------|-----------|------------\n"
                    
                    # Get each violation
                    violationsCount=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].tests[$i].qualityGatesViolations | length" "$SUMMARY_FILE")
                    for ((v=0; v<violationsCount; v++)); do
                        vType=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].tests[$i].qualityGatesViolations[$v].type" "$SUMMARY_FILE")
                        vActual=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].tests[$i].qualityGatesViolations[$v].actual" "$SUMMARY_FILE")
                        vThreshold=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].tests[$i].qualityGatesViolations[$v].threshold" "$SUMMARY_FILE")
                        vExceeded=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].tests[$i].qualityGatesViolations[$v].exceeded" "$SUMMARY_FILE")
                        vPercentOver=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].tests[$i].qualityGatesViolations[$v].percentOver" "$SUMMARY_FILE")
                        
                        if [ "$vType" = "step" ]; then
                            vStepName=$(jq -r ".failedTestsStats.failedTestsByTeam[\"$teamId\"].tests[$i].qualityGatesViolations[$v].stepName" "$SUMMARY_FILE" | cut -c1-23)
                            # Pad step name to 23 chars
                            paddedName=$(printf "%-23s" "$vStepName")
                            SUMMARY+="${paddedName} | ${vActual}ms | ${vThreshold}ms | +${vExceeded}ms (+${vPercentOver}%)\n"
                        else
                            SUMMARY+="TOTAL                   | ${vActual}ms | ${vThreshold}ms | +${vExceeded}ms (+${vPercentOver}%)\n"
                        fi
                    done
                    SUMMARY+="\`\`\`\n"
                fi
                
                SUMMARY+="\n"
            done
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
