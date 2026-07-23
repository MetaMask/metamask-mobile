#!/bin/bash

# Generate Slack notification summary for performance E2E tests
# Usage: ./scripts/generate-slack-summary.sh [summary_file_path]

SUMMARY_FILE="${1:-aggregated-reports/summary.json}"

if [ -f "$SUMMARY_FILE" ]; then
    # Get device information
    androidDevices=$(jq -r '.platformDevices.Android[]? // empty' "$SUMMARY_FILE")
    iosDevices=$(jq -r '.platformDevices.iOS[]? // empty' "$SUMMARY_FILE")
    
    # Count devices
    androidCount=$(jq -r '.platformDevices.Android | length' "$SUMMARY_FILE")
    iosCount=$(jq -r '.platformDevices.iOS | length' "$SUMMARY_FILE")
    totalDevices=$((androidCount + iosCount))
    
    # Get build type (normal vs experimental)
    buildType=$(jq -r '.buildType // "Normal"' "$SUMMARY_FILE")
    totalTests=$(jq -r '.uniqueTests // .totalTests // 0' "$SUMMARY_FILE")

    # Get failed tests statistics
    # uniqueFailedTests counts each test name once regardless of how many platforms failed
    totalFailedTests=$(jq -r '.failedTestsStats.totalFailedTests // 0' "$SUMMARY_FILE")
    uniqueFailedTests=$(jq -r '.failedTestsStats.uniqueFailedTests // .failedTestsStats.totalFailedTests // 0' "$SUMMARY_FILE")
    teamsAffected=$(jq -r '.failedTestsStats.teamsAffected // 0' "$SUMMARY_FILE")
    
    # Category status must reflect quality-gate failures from summary.json.
    # Performance jobs intentionally exit green when only quality gates fail, so
    # GitHub job conclusions alone are not enough for RESULTS BY CATEGORY.
    category_has_failures() {
        local platform="$1"   # Android | iOS
        local category="$2"   # onboarding | imported-wallet
        local platformKey
        platformKey=$(echo "$platform" | tr '[:upper:]' '[:lower:]')

        # Prefer aggregated category counts when available.
        local count
        count=$(jq -r --arg cat "$category" --arg plat "$platformKey" \
            '.metadata.failedTestsByCategory[$cat][$plat] // empty' "$SUMMARY_FILE")
        if [ -n "$count" ]; then
            [ "$count" -gt 0 ]
            return $?
        fi

        # Fallback for older summaries without failedTestsByCategory.
        jq -e --arg plat "$platform" --arg cat "$category" '
          [.failedTestsStats.failedTestsByTeam // {} | .[] | .tests[]?
            | select(.platform == $plat)
            | (
                .scenario // (
                  .testFilePath // ""
                  | if test("/performance/onboarding/") then "onboarding"
                    elif test("/performance/mm-connect/") then "mm-connect"
                    else "imported-wallet"
                    end
                )
              ) as $scenario
            | select($scenario == $cat)
          ] | length > 0
        ' "$SUMMARY_FILE" >/dev/null 2>&1
    }

    apply_category_failures() {
        local status="$1"
        local platform="$2"
        local category="$3"

        # Preserve SKIPPED (job never ran). Upgrade PASSED/UNKNOWN when summary
        # has failures for this category/platform (including quality gates).
        if [[ "$status" == *"SKIPPED"* ]]; then
            echo "$status"
            return
        fi
        if [[ "$status" == *"FAILED"* ]]; then
            echo "$status"
            return
        fi

        if category_has_failures "$platform" "$category"; then
            echo "❌ FAILED"
        else
            echo "$status"
        fi
    }

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
                
                # Collect all matching job conclusions (matrix can have multiple devices).
                local conclusions
                conclusions=$(echo "$jobStatuses" | jq -r \
                    --arg p "$platform" --arg t "$test_type" \
                    '.jobs[] | select(.name | contains($p) and contains($t)) | .conclusion')
                
                if [ -z "$(echo "$conclusions" | sed '/^$/d')" ]; then
                    echo "⏭️ SKIPPED"
                elif echo "$conclusions" | grep -qx "failure"; then
                    echo "❌ FAILED"
                elif echo "$conclusions" | grep -qx "success"; then
                    echo "✅ PASSED"
                else
                    # Jobs exist but none succeeded/failed (e.g. all skipped)
                    echo "⏭️ SKIPPED"
                fi
            }
            
            # Get status for each platform and test type
            androidOnboardingStatus=$(get_job_status "Android" "Onboarding")
            iosOnboardingStatus=$(get_job_status "iOS" "Onboarding")
            androidImportedWalletStatus=$(get_job_status "Android" "Imported Wallet")
            iosImportedWalletStatus=$(get_job_status "iOS" "Imported Wallet")
        else
            androidOnboardingStatus="❓ UNKNOWN"
            iosOnboardingStatus="❓ UNKNOWN"
            androidImportedWalletStatus="❓ UNKNOWN"
            iosImportedWalletStatus="❓ UNKNOWN"
        fi
    else
        # Local / no API: derive skipped platforms from devices present in summary.
        if [ "$androidCount" -gt 0 ]; then
            androidOnboardingStatus="✅ PASSED"
            androidImportedWalletStatus="✅ PASSED"
        else
            androidOnboardingStatus="⏭️ SKIPPED"
            androidImportedWalletStatus="⏭️ SKIPPED"
        fi
        if [ "$iosCount" -gt 0 ]; then
            iosOnboardingStatus="✅ PASSED"
            iosImportedWalletStatus="✅ PASSED"
        else
            iosOnboardingStatus="⏭️ SKIPPED"
            iosImportedWalletStatus="⏭️ SKIPPED"
        fi
    fi

    androidOnboardingStatus=$(apply_category_failures "$androidOnboardingStatus" "Android" "onboarding")
    iosOnboardingStatus=$(apply_category_failures "$iosOnboardingStatus" "iOS" "onboarding")
    androidImportedWalletStatus=$(apply_category_failures "$androidImportedWalletStatus" "Android" "imported-wallet")
    iosImportedWalletStatus=$(apply_category_failures "$iosImportedWalletStatus" "iOS" "imported-wallet")
    
    # Build type label
    if [ "$buildType" = "Experimental" ]; then
        buildTypeLabel="Experimental"
    else
        buildTypeLabel="Normal"
    fi

    # Helper: format device key "DeviceName+OSVersion" -> "DeviceName (vOSVersion)"
    format_device_name() {
        local device="$1"
        if [[ "$device" == *"+"* ]]; then
            local ver="${device##*+}"
            local name="${device%+*}"
            echo "${name} (v${ver})"
        else
            echo "$device"
        fi
    }

    # --- Build the formatted message ---

    SUMMARY="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    SUMMARY+="*🔄 Performance E2E Tests — ${buildTypeLabel} Build*\n"
    SUMMARY+="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"

    # Count job-level failures (jobs that failed before producing test results)
    jobFailures=0
    for status in "$androidOnboardingStatus" "$iosOnboardingStatus" "$androidImportedWalletStatus" "$iosImportedWalletStatus"; do
        if [[ "$status" == *"FAILED"* ]]; then
            ((jobFailures++))
        fi
    done

    # Executive Summary
    SUMMARY+="*📊 SUMMARY*\n"
    if [ "$uniqueFailedTests" -gt 0 ]; then
        SUMMARY+="├─ 🚫 Status: FAILED (${uniqueFailedTests} errors)\n"
    elif [ "$jobFailures" -gt 0 ]; then
        SUMMARY+="├─ 🚫 Status: FAILED (${jobFailures} job failures)\n"
    else
        SUMMARY+="├─ ✅ Status: PASSED\n"
    fi
    SUMMARY+="├─ 📱 Devices: ${totalDevices}\n"
    SUMMARY+="└─ 🧪 Total tests: ${totalTests}\n\n"

    # Devices Tested
    SUMMARY+="*📱 DEVICES TESTED*\n"

    ios_device_arr=()
    while IFS= read -r line; do
        [ -n "$line" ] && ios_device_arr+=("$line")
    done <<< "$iosDevices"

    android_device_arr=()
    while IFS= read -r line; do
        [ -n "$line" ] && android_device_arr+=("$line")
    done <<< "$androidDevices"

    if [ "$iosCount" -gt 0 ]; then
        if [ "$androidCount" -gt 0 ]; then
            SUMMARY+="├─ *iOS* (${iosCount})\n"
            for i in "${!ios_device_arr[@]}"; do
                dev=$(format_device_name "${ios_device_arr[$i]}")
                if [ $((i + 1)) -eq ${#ios_device_arr[@]} ]; then
                    SUMMARY+="│  └─ ${dev}\n"
                else
                    SUMMARY+="│  ├─ ${dev}\n"
                fi
            done
        else
            SUMMARY+="└─ *iOS* (${iosCount})\n"
            for i in "${!ios_device_arr[@]}"; do
                dev=$(format_device_name "${ios_device_arr[$i]}")
                if [ $((i + 1)) -eq ${#ios_device_arr[@]} ]; then
                    SUMMARY+="   └─ ${dev}\n"
                else
                    SUMMARY+="   ├─ ${dev}\n"
                fi
            done
        fi
    fi

    if [ "$androidCount" -gt 0 ]; then
        SUMMARY+="└─ *Android* (${androidCount})\n"
        for i in "${!android_device_arr[@]}"; do
            dev=$(format_device_name "${android_device_arr[$i]}")
            if [ $((i + 1)) -eq ${#android_device_arr[@]} ]; then
                SUMMARY+="   └─ ${dev}\n"
            else
                SUMMARY+="   ├─ ${dev}\n"
            fi
        done
    fi

    SUMMARY+="\n"

    # Results by Category
    SUMMARY+="*📋 RESULTS BY CATEGORY*\n"
    SUMMARY+="├─ Onboarding: ${iosOnboardingStatus} iOS · ${androidOnboardingStatus} Android\n"
    SUMMARY+="└─ Imported Wallet: ${iosImportedWalletStatus} iOS · ${androidImportedWalletStatus} Android\n\n"

    # Failed Tests Section
    if [ "$uniqueFailedTests" -gt 0 ]; then
        SUMMARY+="*❌ FAILED TESTS (${uniqueFailedTests})*\n"

        iosFailedCount=$(jq -r '.metadata.failedTestsByPlatform.ios // 0' "$SUMMARY_FILE")
        androidFailedCount=$(jq -r '.metadata.failedTestsByPlatform.android // 0' "$SUMMARY_FILE")

        for platData in "iOS|🍎|$iosFailedCount" "Android|🤖|$androidFailedCount"; do
            IFS='|' read -r platName platEmoji platFailCount <<< "$platData"
            [ "$platFailCount" -eq 0 ] && continue

            SUMMARY+="\n┌─ *${platEmoji} ${platName}* (${platFailCount} failures)\n│\n"

            prevMention=""
            while IFS=$'\t' read -r mention teamCount name reasonDisplay recordings; do
                [ -z "$mention" ] && continue

                if [ "$mention" != "$prevMention" ]; then
                    SUMMARY+="├─ ${mention} (${teamCount})\n"
                    prevMention="$mention"
                fi

                SUMMARY+="│  ├─ ❌ ${name} — ${reasonDisplay}\n"
                if [ -n "$recordings" ] && [ "$recordings" != "—" ]; then
                    SUMMARY+="│  │  └─ 📹 ${recordings}\n"
                fi
            done <<< "$(jq -r --arg plat "$platName" '
              .failedTestsStats.failedTestsByTeam | to_entries[] |
              .value.team.slackMention as $mention |
              (.value.tests | map(select(.platform == $plat)) | group_by(.testName)) as $grouped |
              select(($grouped | length) > 0) |
              ($grouped | map(length) | add) as $teamCount |

              $grouped[] |
              if length > 0 then
                (.[0].testName) as $name |
                (.[0].failureReason |
                  if . == "quality_gates_exceeded" then "Quality gates FAILED"
                  elif . == "timedOut" then "Test timed out"
                  elif . == "test_error" or . == "failed" then "Test error"
                  else . // "Unknown" end
                ) as $reasonDisplay |
                ([.[] |
                  (if .device != null and .device != "" then
                    (if (.device | type) == "object" then (.device.name // "")
                    else (.device | tostring | split("+") | if length > 1 then .[:-1] | join("+") else .[0] end)
                    end)
                  else .platform end
                  | gsub("Google "; "") | gsub("Samsung "; "")) as $shortName |
                  if .recordingLink != null and .recordingLink != "" then
                    "<" + .recordingLink + "|" + $shortName + ">"
                  else
                    (if .sessionId != null and .sessionId != "" then
                      $shortName
                    else "—" end)
                  end
                ] | join(" | ")) as $recordings |
                [$mention, ($teamCount | tostring), $name, $reasonDisplay, $recordings] | @tsv
              else empty end
            ' "$SUMMARY_FILE" 2>/dev/null)"
        done

        SUMMARY+="\n"
    fi

    # Build Info
    SUMMARY+="*🔧 BUILD INFO*\n"
    SUMMARY+="├─ Build: ${buildTypeLabel}\n"
    SUMMARY+="├─ Branch: \`$GITHUB_REF_NAME\`\n"
    SUMMARY+="└─ Commit: \`${GITHUB_SHA:0:7}\`\n\n"

    SUMMARY+="<${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}|🔗 View full results>\n"
    SUMMARY+="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    echo "$SUMMARY"
else
    echo "🚀 *Performance E2E Tests*"
    echo ""
    echo "⚠️ No test results available"
fi