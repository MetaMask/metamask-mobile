#!/usr/bin/env node

/**
 * Performance Test Results Aggregator
 * 
 * This script aggregates performance test results from multiple test runs
 * and creates a combined report structure.
 * 
 * Handles both:
 * - Imported Wallet Tests: *-imported-wallet-test-results-*
 * - Onboarding Tests: *-onboarding-flow-test-results-*
 */

import fs from 'fs';
import path from 'path';

/**
 * Recursively find JSON files containing performance metrics
 * @param {string} dir - Directory to search
 * @param {string[]} jsonFiles - Array to collect found files
 * @returns {string[]} Array of JSON file paths
 */
function findJsonFiles(dir, jsonFiles = []) {
  if (!fs.existsSync(dir)) {
    console.log(`❌ Directory does not exist: ${dir}`);
    return jsonFiles;
  }
  
  console.log(`🔍 Searching in directory: ${dir}`);
  const files = fs.readdirSync(dir);
  console.log(`📁 Found ${files.length} files/directories:`, files);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      console.log(`📂 Recursing into subdirectory: ${file}`);
      findJsonFiles(fullPath, jsonFiles);
    } else if (file.endsWith('.json')) {
      console.log(`📄 Found JSON file: ${file}`);
      if (file.includes('performance-metrics')) {
        console.log(`✅ Found performance-metrics file: ${fullPath}`);
        jsonFiles.push(fullPath);
      } else {
        console.log(`⚠️ JSON file does not contain 'performance-metrics': ${file}`);
      }
    }
  }
  return jsonFiles;
}

/**
 * Extract platform, scenario, and device information from file path
 * @param {string} filePath - Path to the test result file
 * @returns {Object} Platform, scenario, and device information
 */
function extractPlatformScenarioAndDevice(filePath) {
  const pathParts = filePath.split('/');
  let platform = 'unknown';
  let platformKey = 'Unknown';
  let scenario = 'unknown';
  let scenarioKey = 'Unknown';
  let deviceKey = 'Unknown Device';
  
  console.log(`🔍 Analyzing file path: ${filePath}`);
  console.log(`📁 Path parts:`, pathParts);
  
  // Look for platform and scenario indicators in the path
  const fullPath = filePath.toLowerCase();
  
  // Determine platform and scenario from path patterns
  if (fullPath.includes('android-imported-wallet-test-results')) {
    platform = 'android';
    platformKey = 'Android';
    scenario = 'imported-wallet';
    scenarioKey = 'ImportedWallet';
    console.log(`✅ Detected Android Imported Wallet test`);
  } else if (fullPath.includes('ios-imported-wallet-test-results')) {
    platform = 'ios';
    platformKey = 'iOS';
    scenario = 'imported-wallet';
    scenarioKey = 'ImportedWallet';
    console.log(`✅ Detected iOS Imported Wallet test`);
  } else if (fullPath.includes('android-onboarding-flow-test-results')) {
    platform = 'android';
    platformKey = 'Android';
    scenario = 'onboarding';
    scenarioKey = 'Onboarding';
    console.log(`✅ Detected Android Onboarding test`);
  } else if (fullPath.includes('ios-onboarding-flow-test-results')) {
    platform = 'ios';
    platformKey = 'iOS';
    scenario = 'onboarding';
    scenarioKey = 'Onboarding';
    console.log(`✅ Detected iOS Onboarding test`);
  } else {
    console.log(`⚠️ Could not determine platform/scenario from path`);
    console.log(`🔍 Full path: ${filePath}`);
  }
  
  // Extract device info from path
  const deviceMatch = pathParts.find(part => 
    part.includes('-imported-wallet-test-results-') || 
    part.includes('-onboarding-flow-test-results-')
  );
  
  if (deviceMatch) {
    console.log(`✅ Found device match: ${deviceMatch}`);
    const parts = deviceMatch.split('-');
    console.log(`📝 Device parts:`, parts);
    
    // Handle both imported-wallet and onboarding patterns
    // Pattern: android-imported-wallet-test-results-DeviceName-OSVersion
    // Pattern: android-onboarding-flow-test-results-DeviceName-OSVersion
    let deviceInfoStart = 5; // Skip: android-imported-wallet-test-results (5 parts)
    if (deviceMatch.includes('-onboarding-flow-test-results-')) {
      deviceInfoStart = 5; // Skip: android-onboarding-flow-test-results (5 parts)
    }
    
    if (parts.length >= deviceInfoStart + 1) {
      const deviceInfo = parts.slice(deviceInfoStart).join('-');
      console.log(`📱 Extracted device info: ${deviceInfo}`);
      
      // Create device key in format "DeviceName+OSVersion"
      const deviceParts = deviceInfo.split('-');
      if (deviceParts.length >= 2) {
        const osVersion = deviceParts[deviceParts.length - 1];
        const deviceName = deviceParts.slice(0, -1).join(' ');
        deviceKey = `${deviceName}+${osVersion}`;
        console.log(`🔑 Created device key: ${deviceKey}`);
      } else {
        deviceKey = deviceInfo;
        console.log(`🔑 Using device info as key: ${deviceKey}`);
      }
    }
  } else {
    console.log(`⚠️ No device match found in path parts`);
    console.log(`🔍 Looking for patterns: -imported-wallet-test-results- or -onboarding-flow-test-results-`);
    console.log(`🔍 Available parts:`, pathParts);
  }
  
  console.log(`📊 Final extraction: platform="${platformKey}", scenario="${scenarioKey}", device="${deviceKey}"`);
  return { platform, platformKey, scenario, scenarioKey, deviceKey };
}


/**
 * Process a single test report and clean the data
 * @param {Object} testReport - Raw test report data
 * @returns {Object} Cleaned test report
 */
function processTestReport(testReport) {
  const cleanedReport = {
    testName: testReport.testName,
    steps: testReport.steps || [],
    totalTime: testReport.total,
    videoURL: testReport.videoURL || null,
    sessionId: testReport.sessionId || null,
    device: testReport.device || null,
    // Include profiling data if available
    profilingData: testReport.profilingData || null,
    profilingSummary: testReport.profilingSummary || null,
    // BrowserStack network logs (HAR) per test
    apiCalls: testReport.apiCalls ?? null,
    apiCallsError: testReport.apiCallsError ?? null
  };
  
  if (testReport.testFailed) {
    cleanedReport.testFailed = true;
    cleanedReport.failureReason = testReport.failureReason;
  }
  
  return cleanedReport;
}

/**
 * Create empty report structure when no results are found
 * @param {string} outputPath - Path to save the empty report
 */
function createEmptyReport(outputPath) {
  console.log('❌ No performance JSON files found - creating empty report structure');
  
  const emptyReport = {
    Android: {},
    iOS: {}
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(emptyReport, null, 2));
  fs.writeFileSync('appwright/aggregated-reports/aggregated-performance-report.json', JSON.stringify(emptyReport, null, 2));
  
  const emptySummary = {
    totalTests: 0,
    platforms: { android: 0, ios: 0 },
    testsByPlatform: { android: 0, ios: 0 },
    devices: [],
    platformDevices: { Android: [], iOS: [] },
    profilingStats: {
      testsWithProfiling: 0,
      testsWithVideo: 0,
      profilingCoverage: '0%',
      totalPerformanceIssues: 0,
      totalCriticalIssues: 0,
      avgCpuUsage: '0%',
      avgMemoryUsage: '0 MB',
      profilingTestCount: 0
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      totalReports: 0,
      platforms: { android: 0, ios: 0 },
      jobResults: { android: "unknown", ios: "unknown" },
      branch: process.env.BRANCH_NAME || process.env.GITHUB_REF_NAME || 'unknown',
      commit: process.env.GITHUB_SHA || 'unknown',
      workflowRun: process.env.GITHUB_RUN_ID || 'unknown'
    },
    generatedAt: new Date().toISOString(),
    branch: process.env.BRANCH_NAME || process.env.GITHUB_REF_NAME || 'unknown',
    commit: process.env.GITHUB_SHA || 'unknown',
    warning: 'No test results found'
  };
  
  fs.writeFileSync('appwright/aggregated-reports/summary.json', JSON.stringify(emptySummary, null, 2));
  console.log('✅ Empty report structure created successfully');
}

/**
 * Create fallback report when aggregation fails
 * @param {string} outputPath - Path to save the fallback report
 * @param {Error} error - The error that occurred
 */
function createFallbackReport(outputPath, error) {
  console.error('❌ Error during aggregation:', error.message);
  
  const fallbackReport = {
    Android: {},
    iOS: {}
  };
  
  try {
    fs.writeFileSync(outputPath, JSON.stringify(fallbackReport, null, 2));
    fs.writeFileSync('appwright/aggregated-reports/aggregated-performance-report.json', JSON.stringify(fallbackReport, null, 2));
    fs.writeFileSync('appwright/aggregated-reports/summary.json', JSON.stringify({
      totalTests: 0,
      platforms: { android: 0, ios: 0 },
      testsByPlatform: { android: 0, ios: 0 },
      devices: [],
      platformDevices: { Android: [], iOS: [] },
      profilingStats: {
        testsWithProfiling: 0,
        testsWithVideo: 0,
        profilingCoverage: '0%',
        totalPerformanceIssues: 0,
        totalCriticalIssues: 0,
        avgCpuUsage: '0%',
        avgMemoryUsage: '0 MB',
        profilingTestCount: 0
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        totalReports: 0,
        platforms: { android: 0, ios: 0 },
        jobResults: { android: "error", ios: "error" },
        branch: process.env.BRANCH_NAME || process.env.GITHUB_REF_NAME || 'unknown',
        commit: process.env.GITHUB_SHA || 'unknown',
        workflowRun: process.env.GITHUB_RUN_ID || 'unknown'
      },
      generatedAt: new Date().toISOString(),
      branch: process.env.BRANCH_NAME || process.env.GITHUB_REF_NAME || 'unknown',
      commit: process.env.GITHUB_SHA || 'unknown',
      error: error.message
    }, null, 2));
    console.log('✅ Fallback reports created successfully');
  } catch (writeError) {
    console.error('❌ Failed to create fallback reports:', writeError.message);
  }
}

/**
 * Count tests and create summary statistics
 * @param {Object} groupedResults - Grouped test results
 * @returns {Object} Summary statistics
 */
function createSummary(groupedResults) {
  let totalTests = 0;
  const devices = [];
  let totalTestsWithProfiling = 0;
  let totalTestsWithVideo = 0;
  let totalPerformanceIssues = 0;
  let totalCriticalIssues = 0;
  let totalCpuUsage = 0;
  let totalMemoryUsage = 0;
  let profilingTestCount = 0;
  
  Object.keys(groupedResults).forEach(platform => {
    Object.keys(groupedResults[platform]).forEach(device => {
      devices.push(`${platform}-${device}`);
      const deviceTests = groupedResults[platform][device];
      totalTests += deviceTests.length;
      
      // Count profiling data across all tests
      deviceTests.forEach(test => {
        if (test.profilingData && !test.profilingData.error) {
          totalTestsWithProfiling++;
        }
        if (test.videoURL) {
          totalTestsWithVideo++;
        }
        if (test.profilingSummary && !test.profilingSummary.error) {
          totalPerformanceIssues += test.profilingSummary.issues || 0;
          totalCriticalIssues += test.profilingSummary.criticalIssues || 0;
          totalCpuUsage += test.profilingSummary.cpu?.avg || 0;
          totalMemoryUsage += test.profilingSummary.memory?.avg || 0;
          profilingTestCount++;
        }
      });
    });
  });
  
  // Count tests by platform
  const platforms = {};
  const testsByPlatform = {};
  const summaryDevices = [];
  const platformDevices = { Android: [], iOS: [] };
  
  Object.keys(groupedResults).forEach(platform => {
    platforms[platform.toLowerCase()] = Object.keys(groupedResults[platform]).length;
    testsByPlatform[platform.toLowerCase()] = 0;
    
    Object.keys(groupedResults[platform]).forEach(device => {
      const testsCount = groupedResults[platform][device].length;
      testsByPlatform[platform.toLowerCase()] += testsCount;
      
      summaryDevices.push({ platform, device, testCount: testsCount });
      platformDevices[platform].push(device);
    });
  });
  
  // Calculate profiling averages
  const avgCpuUsage = profilingTestCount > 0 ? (totalCpuUsage / profilingTestCount).toFixed(2) : 0;
  const avgMemoryUsage = profilingTestCount > 0 ? (totalMemoryUsage / profilingTestCount).toFixed(2) : 0;
  const profilingCoverage = totalTests > 0 ? ((totalTestsWithProfiling / totalTests) * 100).toFixed(1) : 0;
  
  const summary = {
    totalTests,
    platforms,
    testsByPlatform,
    devices: summaryDevices,
    platformDevices,
    profilingStats: {
      testsWithProfiling: totalTestsWithProfiling,
      testsWithVideo: totalTestsWithVideo,
      profilingCoverage: `${profilingCoverage}%`,
      totalPerformanceIssues,
      totalCriticalIssues,
      avgCpuUsage: `${avgCpuUsage}%`,
      avgMemoryUsage: `${avgMemoryUsage} MB`,
      profilingTestCount
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      totalReports: summaryDevices.length,
      platforms,
      jobResults: {
        android: "success", // This would need to be determined from actual test results
        ios: "success"
      },
      branch: process.env.BRANCH_NAME || process.env.GITHUB_REF_NAME || 'unknown',
      commit: process.env.GITHUB_SHA || 'unknown',
      workflowRun: process.env.GITHUB_RUN_ID || 'unknown'
    },
    generatedAt: new Date().toISOString(),
    branch: process.env.BRANCH_NAME || process.env.GITHUB_REF_NAME || 'unknown',
    commit: process.env.GITHUB_SHA || 'unknown'
  };
  
  return summary;
}


/**
 * Format duration in a human-readable way
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
}

/**
 * Generate HTML report from aggregated results
 * @param {Object} groupedResults - Grouped test results
 * @param {Object} summary - Summary statistics
 * @returns {string} HTML content
 */
function generateHtmlReport(groupedResults, summary) {
  const timestamp = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  // Count passed/failed tests
  let passedTests = 0;
  let failedTests = 0;
  const allTests = [];

  Object.keys(groupedResults).forEach(platform => {
    Object.keys(groupedResults[platform]).forEach(device => {
      groupedResults[platform][device].forEach(test => {
        if (test.testFailed) {
          failedTests++;
        } else {
          passedTests++;
        }
        allTests.push({ ...test, platform, device });
      });
    });
  });

  const passRate = summary.totalTests > 0 
    ? ((passedTests / summary.totalTests) * 100).toFixed(1) 
    : 0;

  // Generate test rows HTML
  const generateTestRows = () => {
    return allTests.map(test => {
      const statusClass = test.testFailed ? 'status-failed' : 'status-passed';
      const statusIcon = test.testFailed ? '✗' : '✓';
      const statusText = test.testFailed ? 'Failed' : 'Passed';
      
      const stepsHtml = test.steps && test.steps.length > 0 
        ? test.steps.map(step => `
            <div class="step-item">
              <span class="step-name">${step.stepName || step.name || 'Step'}</span>
              <span class="step-duration">${formatDuration(step.duration || step.time || 0)}</span>
            </div>
          `).join('')
        : '<div class="no-steps">No step data</div>';

      const videoLink = test.videoURL 
        ? `<a href="${test.videoURL}" target="_blank" class="video-link">▶ Watch Video</a>`
        : '<span class="no-video">No video</span>';

      const profilingHtml = test.profilingSummary && !test.profilingSummary.error
        ? `<div class="profiling-badge">
            <span title="CPU">🔥 ${test.profilingSummary.cpu?.avg?.toFixed(1) || 'N/A'}%</span>
            <span title="Memory">💾 ${test.profilingSummary.memory?.avg?.toFixed(1) || 'N/A'} MB</span>
            ${test.profilingSummary.issues > 0 ? `<span class="issues-badge" title="Performance Issues">⚠️ ${test.profilingSummary.issues}</span>` : ''}
          </div>`
        : '';

      const failureReason = test.testFailed && test.failureReason
        ? `<div class="failure-reason">${test.failureReason}</div>`
        : '';

      return `
        <tr class="test-row ${test.testFailed ? 'failed-row' : ''}">
          <td>
            <div class="test-name-cell">
              <span class="status-badge ${statusClass}">${statusIcon}</span>
              <div class="test-info">
                <span class="test-name">${test.testName || 'Unknown Test'}</span>
                ${failureReason}
              </div>
            </div>
          </td>
          <td><span class="platform-badge platform-${test.platform.toLowerCase()}">${test.platform}</span></td>
          <td class="device-cell">${test.device}</td>
          <td class="duration-cell">${formatDuration(test.totalTime || 0)}</td>
          <td class="steps-cell">
            <details class="steps-details">
              <summary>${test.steps?.length || 0} steps</summary>
              <div class="steps-content">${stepsHtml}</div>
            </details>
          </td>
          <td class="profiling-cell">${profilingHtml}</td>
          <td class="video-cell">${videoLink}</td>
        </tr>
      `;
    }).join('');
  };

  // Generate platform breakdown
  const generatePlatformBreakdown = () => {
    return Object.keys(groupedResults).map(platform => {
      const devices = Object.keys(groupedResults[platform]);
      const testCount = devices.reduce((acc, device) => 
        acc + groupedResults[platform][device].length, 0);
      
      const deviceList = devices.map(device => {
        const deviceTests = groupedResults[platform][device];
        const passed = deviceTests.filter(t => !t.testFailed).length;
        const failed = deviceTests.filter(t => t.testFailed).length;
        return `
          <div class="device-item">
            <span class="device-name">${device}</span>
            <div class="device-stats">
              <span class="passed-count">${passed} ✓</span>
              ${failed > 0 ? `<span class="failed-count">${failed} ✗</span>` : ''}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="platform-card">
          <div class="platform-header">
            <span class="platform-icon">${platform === 'Android' ? '🤖' : '🍎'}</span>
            <span class="platform-name">${platform}</span>
            <span class="platform-test-count">${testCount} tests</span>
          </div>
          <div class="device-list">${deviceList}</div>
        </div>
      `;
    }).join('');
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Test Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #21262d;
      --bg-card: #1c2128;
      --border-default: #30363d;
      --border-muted: #21262d;
      --text-primary: #f0f6fc;
      --text-secondary: #8b949e;
      --text-muted: #6e7681;
      --accent-blue: #58a6ff;
      --accent-green: #3fb950;
      --accent-red: #f85149;
      --accent-orange: #d29922;
      --accent-purple: #a371f7;
      --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --gradient-success: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      --gradient-danger: linear-gradient(135deg, #f85149 0%, #ff6b6b 100%);
      --shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
      --shadow-elevated: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 3rem;
      padding: 2rem;
      background: var(--bg-secondary);
      border-radius: 16px;
      border: 1px solid var(--border-default);
    }

    .header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      background: var(--gradient-primary);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.5rem;
    }

    .header .subtitle {
      color: var(--text-secondary);
      font-size: 1rem;
    }

    .meta-info {
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin-top: 1.5rem;
      flex-wrap: wrap;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-muted);
      font-size: 0.875rem;
      font-family: 'JetBrains Mono', monospace;
    }

    .meta-item span:first-child {
      color: var(--text-secondary);
    }

    /* Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .summary-card {
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .summary-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-elevated);
    }

    .summary-card .value {
      font-size: 2.5rem;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }

    .summary-card .label {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-top: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .summary-card.success .value { color: var(--accent-green); }
    .summary-card.danger .value { color: var(--accent-red); }
    .summary-card.info .value { color: var(--accent-blue); }
    .summary-card.warning .value { color: var(--accent-orange); }
    .summary-card.purple .value { color: var(--accent-purple); }

    /* Pass Rate Circle */
    .pass-rate-card {
      position: relative;
      padding: 2rem;
    }

    .pass-rate-circle {
      width: 100px;
      height: 100px;
      margin: 0 auto 1rem;
      position: relative;
    }

    .pass-rate-circle svg {
      transform: rotate(-90deg);
    }

    .pass-rate-circle .bg {
      fill: none;
      stroke: var(--border-default);
      stroke-width: 8;
    }

    .pass-rate-circle .progress {
      fill: none;
      stroke: var(--accent-green);
      stroke-width: 8;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.5s ease;
    }

    .pass-rate-value {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 1.5rem;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Platform Section */
    .section-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .platform-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .platform-card {
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      border-radius: 12px;
      overflow: hidden;
    }

    .platform-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.25rem;
      background: var(--bg-tertiary);
      border-bottom: 1px solid var(--border-default);
    }

    .platform-icon {
      font-size: 1.5rem;
    }

    .platform-name {
      font-weight: 600;
      flex: 1;
    }

    .platform-test-count {
      color: var(--text-muted);
      font-size: 0.875rem;
      font-family: 'JetBrains Mono', monospace;
    }

    .device-list {
      padding: 1rem;
    }

    .device-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      border-radius: 8px;
      margin-bottom: 0.5rem;
      background: var(--bg-secondary);
    }

    .device-item:last-child {
      margin-bottom: 0;
    }

    .device-name {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .device-stats {
      display: flex;
      gap: 0.75rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
    }

    .passed-count { color: var(--accent-green); }
    .failed-count { color: var(--accent-red); }

    /* Tests Table */
    .tests-section {
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      border-radius: 12px;
      overflow: hidden;
    }

    .tests-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      background: var(--bg-tertiary);
      border-bottom: 1px solid var(--border-default);
    }

    .tests-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .filter-tabs {
      display: flex;
      gap: 0.5rem;
    }

    .filter-tab {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      border: 1px solid var(--border-default);
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-tab:hover {
      border-color: var(--accent-blue);
      color: var(--accent-blue);
    }

    .filter-tab.active {
      background: var(--accent-blue);
      border-color: var(--accent-blue);
      color: var(--bg-primary);
    }

    .tests-table-wrapper {
      overflow-x: auto;
    }

    .tests-table {
      width: 100%;
      border-collapse: collapse;
    }

    .tests-table th {
      text-align: left;
      padding: 1rem 1.5rem;
      background: var(--bg-secondary);
      color: var(--text-secondary);
      font-weight: 500;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border-default);
    }

    .tests-table td {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-muted);
      vertical-align: middle;
    }

    .test-row:hover {
      background: var(--bg-secondary);
    }

    .test-row.failed-row {
      background: rgba(248, 81, 73, 0.05);
    }

    .test-name-cell {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .status-badge {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .status-passed {
      background: rgba(63, 185, 80, 0.15);
      color: var(--accent-green);
    }

    .status-failed {
      background: rgba(248, 81, 73, 0.15);
      color: var(--accent-red);
    }

    .test-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .test-name {
      font-weight: 500;
      color: var(--text-primary);
    }

    .failure-reason {
      font-size: 0.75rem;
      color: var(--accent-red);
      padding: 0.25rem 0.5rem;
      background: rgba(248, 81, 73, 0.1);
      border-radius: 4px;
      margin-top: 0.25rem;
    }

    .platform-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .platform-android {
      background: rgba(63, 185, 80, 0.15);
      color: var(--accent-green);
    }

    .platform-ios {
      background: rgba(88, 166, 255, 0.15);
      color: var(--accent-blue);
    }

    .device-cell {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .duration-cell {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
      color: var(--accent-purple);
    }

    /* Steps Details */
    .steps-details {
      font-size: 0.875rem;
    }

    .steps-details summary {
      cursor: pointer;
      color: var(--accent-blue);
      user-select: none;
    }

    .steps-details summary:hover {
      text-decoration: underline;
    }

    .steps-content {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: var(--bg-secondary);
      border-radius: 6px;
      max-height: 200px;
      overflow-y: auto;
    }

    .step-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.375rem 0;
      border-bottom: 1px solid var(--border-muted);
    }

    .step-item:last-child {
      border-bottom: none;
    }

    .step-name {
      color: var(--text-secondary);
      font-size: 0.8rem;
    }

    .step-duration {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .no-steps {
      color: var(--text-muted);
      font-style: italic;
    }

    /* Profiling */
    .profiling-badge {
      display: flex;
      gap: 0.75rem;
      font-size: 0.75rem;
      font-family: 'JetBrains Mono', monospace;
    }

    .profiling-badge span {
      color: var(--text-secondary);
    }

    .issues-badge {
      color: var(--accent-orange) !important;
    }

    /* Video Link */
    .video-link {
      color: var(--accent-blue);
      text-decoration: none;
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .video-link:hover {
      background: rgba(88, 166, 255, 0.15);
    }

    .no-video {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    /* Profiling Stats Section */
    .profiling-section {
      margin-bottom: 3rem;
    }

    .profiling-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
    }

    .profiling-stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      border-radius: 10px;
      padding: 1.25rem;
    }

    .profiling-stat-card .icon {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .profiling-stat-card .value {
      font-size: 1.5rem;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-primary);
    }

    .profiling-stat-card .label {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 2rem;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--text-muted);
    }

    .empty-state .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-state h3 {
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .container {
        padding: 1rem;
      }

      .header h1 {
        font-size: 1.75rem;
      }

      .meta-info {
        flex-direction: column;
        gap: 0.75rem;
      }

      .summary-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .tests-table th,
      .tests-table td {
        padding: 0.75rem 1rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <h1>🚀 Performance Test Report</h1>
      <p class="subtitle">MetaMask Mobile E2E Performance Results</p>
      <div class="meta-info">
        <div class="meta-item">
          <span>📅</span>
          <span>${timestamp}</span>
        </div>
        <div class="meta-item">
          <span>🌿</span>
          <span>Branch: ${summary.branch || 'unknown'}</span>
        </div>
        <div class="meta-item">
          <span>🔗</span>
          <span>Commit: ${(summary.commit || 'unknown').substring(0, 8)}</span>
        </div>
        ${summary.metadata?.workflowRun && summary.metadata.workflowRun !== 'unknown' ? `
        <div class="meta-item">
          <span>⚡</span>
          <span>Run: #${summary.metadata.workflowRun}</span>
        </div>
        ` : ''}
      </div>
    </header>

    <!-- Summary Cards -->
    <div class="summary-grid">
      <div class="summary-card pass-rate-card">
        <div class="pass-rate-circle">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle class="bg" cx="50" cy="50" r="42"/>
            <circle class="progress" cx="50" cy="50" r="42" 
              stroke-dasharray="${2 * Math.PI * 42}" 
              stroke-dashoffset="${2 * Math.PI * 42 * (1 - passRate / 100)}"
              style="stroke: ${passRate >= 80 ? 'var(--accent-green)' : passRate >= 50 ? 'var(--accent-orange)' : 'var(--accent-red)'}"/>
          </svg>
          <span class="pass-rate-value" style="color: ${passRate >= 80 ? 'var(--accent-green)' : passRate >= 50 ? 'var(--accent-orange)' : 'var(--accent-red)'}">${passRate}%</span>
        </div>
        <div class="label">Pass Rate</div>
      </div>
      <div class="summary-card info">
        <div class="value">${summary.totalTests}</div>
        <div class="label">Total Tests</div>
      </div>
      <div class="summary-card success">
        <div class="value">${passedTests}</div>
        <div class="label">Passed</div>
      </div>
      <div class="summary-card danger">
        <div class="value">${failedTests}</div>
        <div class="label">Failed</div>
      </div>
      <div class="summary-card purple">
        <div class="value">${summary.devices?.length || 0}</div>
        <div class="label">Devices</div>
      </div>
    </div>

    <!-- Profiling Stats -->
    ${summary.profilingStats && summary.profilingStats.testsWithProfiling > 0 ? `
    <section class="profiling-section">
      <h2 class="section-title">📊 Profiling Overview</h2>
      <div class="profiling-stats">
        <div class="profiling-stat-card">
          <div class="icon">📈</div>
          <div class="value">${summary.profilingStats.profilingCoverage}</div>
          <div class="label">Coverage</div>
        </div>
        <div class="profiling-stat-card">
          <div class="icon">🔥</div>
          <div class="value">${summary.profilingStats.avgCpuUsage}</div>
          <div class="label">Avg CPU</div>
        </div>
        <div class="profiling-stat-card">
          <div class="icon">💾</div>
          <div class="value">${summary.profilingStats.avgMemoryUsage}</div>
          <div class="label">Avg Memory</div>
        </div>
        <div class="profiling-stat-card">
          <div class="icon">⚠️</div>
          <div class="value">${summary.profilingStats.totalPerformanceIssues}</div>
          <div class="label">Issues</div>
        </div>
        <div class="profiling-stat-card">
          <div class="icon">🚨</div>
          <div class="value">${summary.profilingStats.totalCriticalIssues}</div>
          <div class="label">Critical</div>
        </div>
      </div>
    </section>
    ` : ''}

    <!-- Platform Breakdown -->
    <section>
      <h2 class="section-title">📱 Platform Breakdown</h2>
      <div class="platform-grid">
        ${generatePlatformBreakdown()}
      </div>
    </section>

    <!-- Tests Table -->
    <section class="tests-section">
      <div class="tests-header">
        <h2>🧪 Test Results</h2>
        <div class="filter-tabs">
          <button class="filter-tab active" onclick="filterTests('all')">All (${summary.totalTests})</button>
          <button class="filter-tab" onclick="filterTests('passed')">Passed (${passedTests})</button>
          <button class="filter-tab" onclick="filterTests('failed')">Failed (${failedTests})</button>
        </div>
      </div>
      ${allTests.length > 0 ? `
      <div class="tests-table-wrapper">
        <table class="tests-table">
          <thead>
            <tr>
              <th>Test Name</th>
              <th>Platform</th>
              <th>Device</th>
              <th>Duration</th>
              <th>Steps</th>
              <th>Profiling</th>
              <th>Video</th>
            </tr>
          </thead>
          <tbody id="testsTableBody">
            ${generateTestRows()}
          </tbody>
        </table>
      </div>
      ` : `
      <div class="empty-state">
        <div class="icon">📭</div>
        <h3>No Test Results</h3>
        <p>No performance test results were found for this run.</p>
      </div>
      `}
    </section>

    <!-- Footer -->
    <footer class="footer">
      <p>Generated by MetaMask Mobile Performance Test Suite</p>
    </footer>
  </div>

  <script>
    function filterTests(filter) {
      const rows = document.querySelectorAll('.test-row');
      const tabs = document.querySelectorAll('.filter-tab');
      
      tabs.forEach(tab => tab.classList.remove('active'));
      event.target.classList.add('active');
      
      rows.forEach(row => {
        const isFailed = row.classList.contains('failed-row');
        
        if (filter === 'all') {
          row.style.display = '';
        } else if (filter === 'passed') {
          row.style.display = isFailed ? 'none' : '';
        } else if (filter === 'failed') {
          row.style.display = isFailed ? '' : 'none';
        }
      });
    }
  </script>
</body>
</html>
  `;

  return html;
}

/**
 * Main aggregation function
 */
function aggregateReports() {
  try {
    console.log('🔍 Looking for performance JSON reports...');
    
    // Ensure output directory exists
    const outputDir = 'appwright/aggregated-reports';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${outputDir}`);
    }
    
    // Search in multiple directories for different test types
    const searchDirs = [
      './test-results',
      './performance-results', 
      './onboarding-results',
      './',  // Current directory where artifacts are typically extracted
      './appwright',  // Where artifacts are uploaded from
    ];
    
    const jsonFiles = [];
    
    searchDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        console.log(`🔍 Searching in ${dir}...`);
        const dirFiles = findJsonFiles(dir);
        jsonFiles.push(...dirFiles);
      } else {
        console.log(`⚠️ Directory does not exist: ${dir}`);
      }
    });
    
    console.log(`📊 Found ${jsonFiles.length} JSON report files:`);
    jsonFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    
    const outputPath = 'appwright/aggregated-reports/performance-results.json';
    
    if (jsonFiles.length === 0) {
      createEmptyReport(outputPath);
      return;
    }
    
    // Create the grouped structure - match the expected format
    const groupedResults = {
      Android: {},
      iOS: {}
    };
    
    // Process each JSON file
    jsonFiles.forEach((filePath, index) => {
      try {
        console.log(`\n📊 Processing file ${index + 1}/${jsonFiles.length}: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf8');
        const reportData = JSON.parse(content);
        console.log(`✅ Successfully parsed JSON data from ${filePath}`);
        
        // Extract platform, scenario, and device info from file path or JSON content
        let platformKey = 'Unknown';
        let scenarioKey = 'Unknown';
        let deviceKey = 'Unknown Device';
        
        // First try to extract from file path (for artifact folder structure)
        const pathExtraction = extractPlatformScenarioAndDevice(filePath);
        
        if (pathExtraction.platformKey !== 'Unknown') {
          platformKey = pathExtraction.platformKey;
          scenarioKey = pathExtraction.scenarioKey;
          deviceKey = pathExtraction.deviceKey;
        } else {
          // Fallback: extract from JSON content and filename
          if (Array.isArray(reportData) && reportData.length > 0) {
            const firstReport = reportData[0];
            
            if (firstReport.device) {
              // Determine platform from device name
              if (firstReport.device.name.includes('iPhone') || firstReport.device.name.includes('iPad')) {
                platformKey = 'iOS';
              } else {
                platformKey = 'Android';
              }
              
              // Create device key from device info
              deviceKey = `${firstReport.device.name}+${firstReport.device.osVersion}`;
            }
            
            // Determine scenario from test names
            const hasOnboarding = reportData.some(report => 
              report.testName && (
                report.testName.includes('Onboarding') || 
                report.testName.includes('new wallet') ||
                report.testName.includes('SRP')
              )
            );
            
            if (hasOnboarding) {
              scenarioKey = 'Onboarding';
            } else {
              scenarioKey = 'ImportedWallet';
            }
          }
        }
        
        console.log(`📊 Final values: platformKey="${platformKey}", scenarioKey="${scenarioKey}", deviceKey="${deviceKey}"`);
        
        // Initialize structure if it doesn't exist
        console.log(`🔧 Creating keys: platformKey="${platformKey}", deviceKey="${deviceKey}"`);
        if (!groupedResults[platformKey]) {
          groupedResults[platformKey] = {};
          console.log(`✅ Created platform key: ${platformKey}`);
        }
        if (!groupedResults[platformKey][deviceKey]) {
          groupedResults[platformKey][deviceKey] = [];
          console.log(`✅ Created device key: ${deviceKey} under platform ${platformKey}`);
        }
        
        // Process the report data
        if (Array.isArray(reportData)) {
          reportData.forEach(testReport => {
            const cleanedReport = processTestReport(testReport);
            groupedResults[platformKey][deviceKey].push(cleanedReport);
          });
        } else {
          const cleanedReport = processTestReport(reportData);
          groupedResults[platformKey][deviceKey].push(cleanedReport);
        }
      } catch (error) {
        console.error(`❌ Error processing ${filePath}: ${error.message}`);
      }
    });
    
    // Write the combined report
    fs.writeFileSync(outputPath, JSON.stringify(groupedResults, null, 2));
    
    // Create aggregated-performance-report.json (same structure as performance-results.json)
    const aggregatedReportPath = 'appwright/aggregated-reports/aggregated-performance-report.json';
    fs.writeFileSync(aggregatedReportPath, JSON.stringify(groupedResults, null, 2));
    
    // Create summary
    const summary = createSummary(groupedResults);
    fs.writeFileSync('appwright/aggregated-reports/summary.json', JSON.stringify(summary, null, 2));
    
    
    console.log(`✅ Combined report saved: ${summary.totalTests} tests across ${summary.devices.length} device configurations`);
    console.log(`📊 Profiling data: ${summary.profilingStats.testsWithProfiling} tests with profiling data (${summary.profilingStats.profilingCoverage} coverage)`);
    console.log(`⚠️ Performance issues: ${summary.profilingStats.totalPerformanceIssues} total, ${summary.profilingStats.totalCriticalIssues} critical`);
    console.log(`📈 Average CPU: ${summary.profilingStats.avgCpuUsage}, Memory: ${summary.profilingStats.avgMemoryUsage}`);
    console.log('📋 Summary report saved to: appwright/aggregated-reports/summary.json');
    console.log('📋 Aggregated report saved to: appwright/aggregated-reports/aggregated-performance-report.json');
    
    // Generate HTML report
    const htmlReport = generateHtmlReport(groupedResults, summary);
    const htmlReportPath = 'appwright/aggregated-reports/performance-report.html';
    fs.writeFileSync(htmlReportPath, htmlReport);
    console.log(`🌐 HTML report saved to: ${htmlReportPath}`);
    
  } catch (error) {
    createFallbackReport('appwright/aggregated-reports/performance-results.json', error);
  }
}

// Run the aggregation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  aggregateReports();
}
export { aggregateReports, findJsonFiles, extractPlatformScenarioAndDevice, processTestReport, generateHtmlReport, formatDuration };