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
    
    # Add failed tests section: one line per unique test name, grouped by team.
    # Same test failing on Android and iOS shows once with "Failed on Android & iOS" and both recording links.
    if [ "$totalFailedTests" -gt 0 ]; then
        SUMMARY+="*Failed tests:*\n\n"
        
        prevMention=""
        while IFS= read -r line; do
            [ -z "$line" ] && continue
            mention=$(echo "$line" | cut -f1)
            name=$(echo "$line" | cut -f2)
            reasonDisplay=$(echo "$line" | cut -f3)
            platformsLabel=$(echo "$line" | cut -f4)
            recordings=$(echo "$line" | cut -f5-)
            
            if [ "$mention" != "$prevMention" ]; then
                SUMMARY+="${mention}:\n"
                prevMention="$mention"
            fi
            
            if [ -n "$platformsLabel" ]; then
                SUMMARY+="  - ${name} - ${reasonDisplay} -> Failed on ${platformsLabel}: ${recordings}\n"
            else
                SUMMARY+="  - ${name} - ${reasonDisplay} -> ${recordings}\n"
            fi
        done <<< "$(jq -r '
          .failedTestsStats.failedTestsByTeam | to_entries[] |
          .value.team.slackMention as $mention |
          (.value.tests | group_by(.testName)[] |
            (.[0].testName) as $name |
            (.[0].failureReason) as $reason |
            ([.[].platform] | unique) as $platforms |
            ($platforms | join(" & ")) as $platformsLabel |
            ([.[] |
              (if .device != null and .device != "" then (if (.device | type) == "object" then ((.device.name // "") + (if .device.osVersion != null and .device.osVersion != "" then " (" + .device.osVersion + ")" else "" end)) else (.device | tostring) end) else .platform end) as $deviceLabel |
              if .recordingLink != null and .recordingLink != "" then "<" + .recordingLink + "|Recording (" + $deviceLabel + ")>" else (if .sessionId != null and .sessionId != "" then "Recording (" + $deviceLabel + ") (session: " + .sessionId + ")" else "—" end) end
            ] | join(" · ")) as $recordings |
            ($reason | if . == "quality_gates_exceeded" then "Quality gates FAILED" elif . == "timedOut" then "Test timed out" elif . == "test_error" or . == "failed" then "Test error" else . end) as $reasonDisplay |
            [$mention, $name, $reasonDisplay, $platformsLabel, $recordings] | @tsv
          )
        ' "$SUMMARY_FILE" 2>/dev/null)"
        
        SUMMARY+="\n---------------\n\n"
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
