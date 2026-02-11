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
    
    # Get build type (normal vs experimental)
    buildType=$(jq -r '.buildType // "Normal"' "$SUMMARY_FILE")
    totalTests=$(jq -r '.totalTests // 0' "$SUMMARY_FILE")

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
    
    # Build type label with emoji (Normal = stable, Experimental = flask)
    if [ "$buildType" = "Experimental" ]; then
        buildTypeEmoji="🧪"
        buildTypeLabel="Experimental"
    else
        buildTypeEmoji="🔷"
        buildTypeLabel="Normal"
    fi

    # One-line overview (devices + tests + failures if any)
    overviewParts="${totalDevices} device(s)"
    [ "$totalTests" -gt 0 ] && overviewParts="${overviewParts} • ${totalTests} test(s)"
    [ "$totalFailedTests" -gt 0 ] && overviewParts="${overviewParts} • ${totalFailedTests} failed"

    # Create formatted summary with clear sections and emojis
    SUMMARY="*🚀 Performance E2E Tests* — ${buildTypeEmoji} _${buildTypeLabel} Build_\n"
    SUMMARY+="\`${overviewParts}\`\n\n"
    
    SUMMARY+="*📱 Devices tested*\n"
    
    # Function to add device list for a platform
    add_device_list() {
        local emoji="$1"
        local platform="$2"
        local devices="$3"
        local count="$4"
        
        if [ "$count" -gt 0 ]; then
            SUMMARY+="${emoji} *${platform}:* "
            local first=1
            while IFS= read -r device; do
                if [ -n "$device" ]; then
                    [ "$first" -eq 0 ] && SUMMARY+=", "
                    SUMMARY+="${device}"
                    first=0
                fi
            done <<< "$devices"
            SUMMARY+="\n"
        fi
    }
    
    add_device_list "🤖" "Android" "$androidDevices" "$androidCount"
    add_device_list "🍎" "iOS" "$iosDevices" "$iosCount"
    SUMMARY+="\n"
    
    SUMMARY+="*✅ Test results*\n"
    SUMMARY+="• _Onboarding:_ Android $androidOnboardingStatus · iOS $iosOnboardingStatus\n"
    SUMMARY+="• _Imported Wallet:_ Android $androidImportedWalletStatus · iOS $iosImportedWalletStatus\n\n"
    
    # Add failed tests section: one line per unique test name, grouped by team.
    if [ "$totalFailedTests" -gt 0 ]; then
        SUMMARY+="*❌ Failed tests* (${totalFailedTests})\n\n"
        
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
                SUMMARY+="  └ ${name} — ${reasonDisplay} · _${platformsLabel}_\n    ${recordings}\n"
            else
                SUMMARY+="  └ ${name} — ${reasonDisplay}\n    ${recordings}\n"
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
        
        SUMMARY+="\n"
    fi
    
    SUMMARY+="*📦 Build info*\n"
    SUMMARY+="• Build: ${buildTypeEmoji} _${buildTypeLabel}_\n"
    SUMMARY+="• Branch: \`$GITHUB_REF_NAME\` · Commit: \`${GITHUB_SHA:0:7}\`\n\n"
    SUMMARY+="<${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}|📋 View full results>"
    
    echo "$SUMMARY"
else
    echo "🚀 *Performance E2E Tests*"
    echo ""
    echo "⚠️ No test results available"
fi
