#!/usr/bin/env node

/**
 * Performance Test Results Aggregator
 * 
 * This script aggregates performance test results from multiple test runs
 * and creates a combined report structure.
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
 * Extract platform and scenario information from file path
 * @param {string} filePath - Path to the test result file
 * @returns {Object} Platform and scenario information
 */
function extractPlatformAndScenario(filePath) {
  const pathParts = filePath.split('/');
  let platform = 'unknown';
  let platformKey = 'Unknown';
  let scenario = 'unknown';
  let scenarioKey = 'Unknown';
  
  // Determine platform from path (now using combined format)
  if (filePath.includes('android-combined-test-results')) {
    platform = 'android';
    platformKey = 'Android';
    scenario = 'combined';
    scenarioKey = 'Combined';
  } else if (filePath.includes('ios-combined-test-results')) {
    platform = 'ios';
    platformKey = 'iOS';
    scenario = 'combined';
    scenarioKey = 'Combined';
  } else if (filePath.includes('android-imported-wallet-test-results')) {
    platform = 'android';
    platformKey = 'Android';
    scenario = 'imported-wallet';
    scenarioKey = 'ImportedWallet';
  } else if (filePath.includes('ios-imported-wallet-test-results')) {
    platform = 'ios';
    platformKey = 'iOS';
    scenario = 'imported-wallet';
    scenarioKey = 'ImportedWallet';
  } else if (filePath.includes('android-onboarding-test-results')) {
    platform = 'android';
    platformKey = 'Android';
    scenario = 'onboarding';
    scenarioKey = 'Onboarding';
  } else if (filePath.includes('ios-onboarding-test-results')) {
    platform = 'ios';
    platformKey = 'iOS';
    scenario = 'onboarding';
    scenarioKey = 'Onboarding';
  }
  
  return { platform, platformKey, scenario, scenarioKey };
}

/**
 * Extract device information from file path
 * @param {string} filePath - Path to the test result file
 * @returns {string} Device key in format "DeviceName+OSVersion"
 */
function extractDeviceInfo(filePath) {
  const pathParts = filePath.split('/');
  
  // Look for various test result patterns
  const patterns = [
    '-combined-test-results-',
    '-imported-wallet-test-results-',
    '-onboarding-test-results-',
    '-test-results-'
  ];
  
  let deviceMatch = null;
  let pattern = null;
  
  for (const p of patterns) {
    deviceMatch = pathParts.find(part => part.includes(p));
    if (deviceMatch) {
      pattern = p;
      break;
    }
  }
  
  if (deviceMatch && pattern) {
    // Extract the part after the pattern
    const testResultsIndex = deviceMatch.indexOf(pattern);
    const deviceInfo = deviceMatch.substring(testResultsIndex + pattern.length);
    
    // Split by '-' and reconstruct device name and OS version
    const deviceParts = deviceInfo.split('-');
    if (deviceParts.length >= 2) {
      const osVersion = deviceParts[deviceParts.length - 1];
      const deviceName = deviceParts.slice(0, -1).join(' ');
      return `${deviceName}+${osVersion}`;
    } else {
      return deviceInfo;
    }
  }
  
  return 'Unknown Device';
}

/**
 * Determine scenario from test content
 * @param {Object} testReport - Test report data
 * @returns {string} Scenario key (ImportedWallet or Onboarding)
 */
function determineScenarioFromTest(testReport) {
  const testName = (testReport.testName || '').toLowerCase();
  
  // Check for onboarding-specific keywords
  if (testName.includes('onboarding') || 
      testName.includes('create') || 
      testName.includes('new wallet') ||
      testName.includes('seed') ||
      testName.includes('phrase')) {
    return 'Onboarding';
  }
  
  // Default to ImportedWallet for other tests (import, swap, send, asset view, etc.)
  return 'ImportedWallet';
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
    total: testReport.total || testReport.totalTime || 0,
    device: testReport.device || { name: 'Unknown', osVersion: 'Unknown' },
    videoURL: testReport.videoURL || null,
    sessionId: testReport.sessionId || null
  };
  
  if (testReport.testFailed) {
    cleanedReport.testFailed = true;
    cleanedReport.failureReason = testReport.failureReason;
  }
  
  if (testReport.note) {
    cleanedReport.note = testReport.note;
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
    ImportedWallet: { Android: {}, iOS: {} },
    Onboarding: { Android: {}, iOS: {} }
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(emptyReport, null, 2));
  
  const emptySummary = {
    totalTests: 0,
    scenarios: {
      importedWallet: { totalTests: 0, platforms: { android: 0, ios: 0 } },
      onboarding: { totalTests: 0, platforms: { android: 0, ios: 0 } }
    },
    devices: [],
    generatedAt: new Date().toISOString(),
    branch: process.env.GITHUB_REF_NAME || 'unknown',
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
    ImportedWallet: { Android: {}, iOS: {} },
    Onboarding: { Android: {}, iOS: {} }
  };
  
  try {
    fs.writeFileSync(outputPath, JSON.stringify(fallbackReport, null, 2));
    fs.writeFileSync('appwright/aggregated-reports/summary.json', JSON.stringify({
      totalTests: 0,
      scenarios: {
        importedWallet: { totalTests: 0, platforms: { android: 0, ios: 0 } },
        onboarding: { totalTests: 0, platforms: { android: 0, ios: 0 } }
      },
      error: error.message,
      generatedAt: new Date().toISOString()
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
  
  Object.keys(groupedResults).forEach(scenario => {
    Object.keys(groupedResults[scenario]).forEach(platform => {
      Object.keys(groupedResults[scenario][platform]).forEach(device => {
        devices.push(`${scenario}-${platform}-${device}`);
        totalTests += groupedResults[scenario][platform][device].length;
      });
    });
  });
  
  const summary = {
    totalTests,
    scenarios: {
      importedWallet: { totalTests: 0, platforms: { android: 0, ios: 0 } },
      onboarding: { totalTests: 0, platforms: { android: 0, ios: 0 } }
    },
    devices: [],
    metadata: {
      generatedAt: new Date().toISOString(),
      totalReports: totalTests,
      branch: process.env.GITHUB_REF_NAME || 'unknown',
      commit: process.env.GITHUB_SHA || 'unknown',
      workflowRun: process.env.GITHUB_RUN_ID || 'unknown'
    },
    generatedAt: new Date().toISOString(),
    branch: process.env.GITHUB_REF_NAME || 'unknown',
    commit: process.env.GITHUB_SHA || 'unknown'
  };
  
  // Count tests by platform and device
  Object.keys(groupedResults).forEach(platform => {
    Object.keys(groupedResults[platform]).forEach(device => {
      const testsCount = groupedResults[platform][device].length;
      
      // Count by scenario for summary
      const deviceTests = groupedResults[platform][device];
      const importedWalletTests = deviceTests.filter(test => 
        determineScenarioFromTest(test) === 'ImportedWallet'
      ).length;
      const onboardingTests = deviceTests.filter(test => 
        determineScenarioFromTest(test) === 'Onboarding'
      ).length;
      
      summary.scenarios.importedWallet.totalTests += importedWalletTests;
      summary.scenarios.onboarding.totalTests += onboardingTests;
      
      if (platform === 'Android') {
        summary.scenarios.importedWallet.platforms.android += importedWalletTests;
        summary.scenarios.onboarding.platforms.android += onboardingTests;
      } else if (platform === 'iOS') {
        summary.scenarios.importedWallet.platforms.ios += importedWalletTests;
        summary.scenarios.onboarding.platforms.ios += onboardingTests;
      }
      
      summary.devices.push({ platform, device, testCount: testsCount });
    });
  });
  
  return summary;
}

/**
 * Main aggregation function
 */
function aggregateReports() {
  try {
    console.log('🔍 Looking for performance JSON reports...');
    
    // Search all results
    const jsonFiles = findJsonFiles('./all-results');
    console.log(`📊 Found ${jsonFiles.length} JSON report files:`);
    jsonFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    
    const outputPath = 'appwright/aggregated-reports/combined-performance-report.json';
    
    if (jsonFiles.length === 0) {
      createEmptyReport(outputPath);
      return;
    }
    
    // Create the grouped structure - organized by platform then device
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
        
        // Extract platform info from path
        const { platformKey } = extractPlatformAndScenario(filePath);
        const deviceKey = extractDeviceInfo(filePath);
        
        // Initialize structure if it doesn't exist
        if (!groupedResults[platformKey]) {
          groupedResults[platformKey] = {};
        }
        if (!groupedResults[platformKey][deviceKey]) {
          groupedResults[platformKey][deviceKey] = [];
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
    
    // Create summary
    const summary = createSummary(groupedResults);
    fs.writeFileSync('appwright/aggregated-reports/summary.json', JSON.stringify(summary, null, 2));
    
    console.log(`✅ Combined report saved: ${summary.totalTests} tests across ${summary.devices.length} device configurations`);
    console.log('📋 Summary report saved to: appwright/aggregated-reports/summary.json');
    
  } catch (error) {
    createFallbackReport('appwright/aggregated-reports/combined-performance-report.json', error);
  }
}

// Export functions for testing
export { determineScenarioFromTest, extractDeviceInfo, extractPlatformAndScenario, aggregateReports, findJsonFiles, processTestReport };

// Run the aggregation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  aggregateReports();
}
