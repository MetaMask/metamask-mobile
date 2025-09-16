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
    videoURL: testReport.videoURL || null
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
    metadata: {
      generatedAt: new Date().toISOString(),
      totalReports: 0,
      platforms: { android: 0, ios: 0 },
      jobResults: { android: "unknown", ios: "unknown" },
      branch: process.env.GITHUB_REF_NAME || 'unknown',
      commit: process.env.GITHUB_SHA || 'unknown',
      workflowRun: process.env.GITHUB_RUN_ID || 'unknown'
    },
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
      metadata: {
        generatedAt: new Date().toISOString(),
        totalReports: 0,
        platforms: { android: 0, ios: 0 },
        jobResults: { android: "error", ios: "error" },
        branch: process.env.GITHUB_REF_NAME || 'unknown',
        commit: process.env.GITHUB_SHA || 'unknown',
        workflowRun: process.env.GITHUB_RUN_ID || 'unknown'
      },
      generatedAt: new Date().toISOString(),
      branch: process.env.GITHUB_REF_NAME || 'unknown',
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
  
  Object.keys(groupedResults).forEach(platform => {
    Object.keys(groupedResults[platform]).forEach(device => {
      devices.push(`${platform}-${device}`);
      totalTests += groupedResults[platform][device].length;
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
  
  const summary = {
    totalTests,
    platforms,
    testsByPlatform,
    devices: summaryDevices,
    platformDevices,
    metadata: {
      generatedAt: new Date().toISOString(),
      totalReports: summaryDevices.length,
      platforms,
      jobResults: {
        android: "success", // This would need to be determined from actual test results
        ios: "success"
      },
      branch: process.env.GITHUB_REF_NAME || 'unknown',
      commit: process.env.GITHUB_SHA || 'unknown',
      workflowRun: process.env.GITHUB_RUN_ID || 'unknown'
    },
    generatedAt: new Date().toISOString(),
    branch: process.env.GITHUB_REF_NAME || 'unknown',
    commit: process.env.GITHUB_SHA || 'unknown'
  };
  
  return summary;
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
    console.log('📋 Summary report saved to: appwright/aggregated-reports/summary.json');
    console.log('📋 Aggregated report saved to: appwright/aggregated-reports/aggregated-performance-report.json');
    
  } catch (error) {
    createFallbackReport('appwright/aggregated-reports/performance-results.json', error);
  }
}

// Run the aggregation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  aggregateReports();
}
export { aggregateReports, findJsonFiles, extractPlatformScenarioAndDevice, processTestReport };

