#!/usr/bin/env bash

# Set strict error handling
set -euo pipefail

# Constants
BASE_DIR="./e2e/specs"
# TEST_SUITE_TAG=".*SmokeEarn.*"

echo "Searching for tests with pattern: $TEST_SUITE_TAG"

# Initialize an array to store matching files
declare -a matching_files

# Find matching files and store them in the array
while IFS= read -r file; do
    if [ -n "$file" ]; then
        matching_files+=("$file")
        echo "Found matching test: $file"
    fi
done < <(find "$BASE_DIR" -type f \( -name "*.spec.js" -o -name "*.spec.ts" \) -not -path "*/quarantine/*" -exec grep -l "$TEST_SUITE_TAG" {} \; | sort -u)

# Check if any files were found
if [ ${#matching_files[@]} -eq 0 ]; then
    echo " No test files found containing pattern: $TEST_SUITE_TAG"
    exit 1
fi

# Display results
echo -e "\n Found ${#matching_files[@]} matching test files:"
printf '%s\n' "${matching_files[@]}" | sed 's/^/  - /'

# Run all matching tests in a single command
echo -e "\nRunning matching tests..."

# Debug: Show exactly what files will be passed to Jest
echo "🔍 Debug: Files being passed to Jest:"
printf '  - %s\n' "${matching_files[@]}"
echo "🔍 Debug: Total files: ${#matching_files[@]}"

# Pass array elements directly as separate arguments (proper shell array expansion)
if [[ "$BITRISE_TRIGGERED_WORKFLOW_ID" == *"ios"* ]]; then
    echo "Detected iOS workflow"
    echo "🚀 Executing: yarn test:e2e:ios:run:qa-release ${matching_files[*]}"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:ios:run:qa-release "${matching_files[@]}"
else
    echo "Detected Android workflow" 
    echo "🚀 Executing: yarn test:e2e:android:run:qa-release ${matching_files[*]}"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:android:run:qa-release "${matching_files[@]}"
fi

# Debug: Show what files were generated after test execution
echo -e "\n🔍 Debug: Files in e2e/reports after test execution:"
ls -la e2e/reports/ 2>/dev/null || echo "No reports directory found"

# Merge multiple junit XML files into a single comprehensive report
echo -e "\n🔄 Merging individual XML reports into single junit.xml..."
merge_junit_files() {
    local reports_dir="./e2e/reports"
    local output_file="$reports_dir/junit.xml"
    
    # Check if we have any junit XML files to merge
    local junit_files=$(find "$reports_dir" -name "junit-*.xml" 2>/dev/null || true)
    
    if [ -z "$junit_files" ]; then
        echo "⚠️  No junit-*.xml files found to merge"
        return 1
    fi
    
    echo "📄 Found XML files to merge:"
    echo "$junit_files" | sed 's/^/  - /'
    
    # Create merged XML using Node.js for reliable XML parsing
    node -e "
    const fs = require('fs');
    const path = require('path');
    
    try {
        const reportsDir = './e2e/reports';
        const files = fs.readdirSync(reportsDir).filter(f => f.startsWith('junit-') && f.endsWith('.xml'));
        
        if (files.length === 0) {
            console.log('No junit files to merge');
            process.exit(1);
        }
        
        console.log(\`Merging \${files.length} XML files...\`);
        
        let totalTests = 0, totalFailures = 0, totalErrors = 0, totalTime = 0;
        let mergedTestSuites = [];
        
        files.forEach(file => {
            const content = fs.readFileSync(path.join(reportsDir, file), 'utf8');
            
            // Extract testsuite elements and aggregate stats
            const testSuiteMatch = content.match(/<testsuite[^>]*>[\s\S]*?<\/testsuite>/g);
            if (testSuiteMatch) {
                mergedTestSuites.push(...testSuiteMatch);
            }
            
            // Extract stats from testsuites root element
            const statsMatch = content.match(/<testsuites[^>]*tests=\"(\d+)\"[^>]*failures=\"(\d+)\"[^>]*errors=\"(\d+)\"[^>]*time=\"([^\"]+)\"/);
            if (statsMatch) {
                totalTests += parseInt(statsMatch[1]) || 0;
                totalFailures += parseInt(statsMatch[2]) || 0;
                totalErrors += parseInt(statsMatch[3]) || 0;
                totalTime += parseFloat(statsMatch[4]) || 0;
            }
        });
        
        // Create merged XML
        const mergedXml = \`<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<testsuites name=\"jest tests\" tests=\"\${totalTests}\" failures=\"\${totalFailures}\" errors=\"\${totalErrors}\" time=\"\${totalTime.toFixed(3)}\">
\${mergedTestSuites.join('\n')}
</testsuites>\`;
        
        fs.writeFileSync(path.join(reportsDir, 'junit.xml'), mergedXml);
        console.log(\`✅ Successfully merged \${files.length} XML files into junit.xml\`);
        console.log(\`📊 Total: \${totalTests} tests, \${totalFailures} failures, \${totalErrors} errors\`);
        
        // Clean up individual files
        files.forEach(file => {
            fs.unlinkSync(path.join(reportsDir, file));
        });
        console.log('🧹 Cleaned up individual XML files');
        
    } catch (error) {
        console.error('❌ Error merging XML files:', error.message);
        process.exit(1);
    }
    "
}

# Execute the merge function
merge_junit_files

echo -e "\n✅ XML merge completed. Final report structure:"
ls -la e2e/reports/ 2>/dev/null || echo "No reports directory found"
