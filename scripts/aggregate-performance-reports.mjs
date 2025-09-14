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
  
  console.log(`🔍 Analyzing file path: ${filePath}`);
  
  // Look for the artifact folder name in the path
  // Format: test-results/artifact-folder-name/reporters/reports/file.json
  const artifactFolder = pathParts.find(part => part.includes('-test-results-') || part.includes('-flow-test-results-'));
  
  if (artifactFolder) {
    console.log(`🎯 Found artifact folder: ${artifactFolder}`);
    
    // Parse the artifact folder name to extract platform and scenario
    // Format: platform-scenario-test-results-device-os-version OR platform-scenario-flow-test-results-device-os-version
    const parts = artifactFolder.split('-');
    console.log(`🔧 Artifact folder parts:`, parts);
    
    if (parts.length >= 3) {
      // Extract platform (first part)
      if (parts[0] === 'android') {
        platform = 'android';
        platformKey = 'Android';
        console.log(`✅ Detected Android platform from artifact folder`);
      } else if (parts[0] === 'ios') {
        platform = 'ios';
        platformKey = 'iOS';
        console.log(`✅ Detected iOS platform from artifact folder`);
      }
      
      // Extract scenario (second part)
      if (parts[1] === 'imported-wallet') {
        scenario = 'imported-wallet';
        scenarioKey = 'ImportedWallet';
        console.log(`✅ Detected imported wallet scenario from artifact folder`);
      } else if (parts[1] === 'onboarding') {
        scenario = 'onboarding';
        scenarioKey = 'Onboarding';
        console.log(`✅ Detected onboarding scenario from artifact folder`);
      }
    }
  } else {
    console.log(`⚠️ Could not find artifact folder pattern in path: ${filePath}`);
  }
  
  console.log(`📊 Final extraction: platform="${platformKey}", scenario="${scenarioKey}"`);
  return { platform, platformKey, scenario, scenarioKey };
}

/**
 * Extract device information from file path
 * @param {string} filePath - Path to the test result file
 * @returns {string} Device key in format "DeviceName+OSVersion"
 */
function extractDeviceInfo(filePath) {
  const pathParts = filePath.split('/');
  console.log(`🔍 Extracting device info from path: ${filePath}`);
  console.log(`📁 Path parts:`, pathParts);
  
  // Look for the artifact folder name in the path
  // Format: test-results/artifact-folder-name/reporters/reports/file.json
  const artifactFolder = pathParts.find(part => part.includes('-test-results-') || part.includes('-flow-test-results-'));
  
  if (artifactFolder) {
    console.log(`🎯 Found artifact folder: ${artifactFolder}`);
    
    // Parse the artifact folder name to extract device info
    // Format: platform-scenario-test-results-device-os-version OR platform-scenario-flow-test-results-device-os-version
    const parts = artifactFolder.split('-');
    console.log(`🔧 Artifact folder parts:`, parts);
    
    if (parts.length >= 5) {
      // Extract device name and OS version from the end of the artifact folder
      // Skip the first 3 parts: platform-scenario-test-results OR platform-scenario-flow-test-results
      const deviceParts = parts.slice(3);
      console.log(`📱 Device parts:`, deviceParts);
      
      if (deviceParts.length >= 2) {
        // Look for the last part - if it's numeric or contains a dot, it's the version
        const lastPart = deviceParts[deviceParts.length - 1];
        if (/^\d+(\.\d+)?$/.test(lastPart)) {
          // Pattern: "Device-Name-14.0" or "Device-Name-17" -> "Device Name+14.0" or "Device Name+17"
          const osVersion = lastPart;
          const deviceName = deviceParts.slice(0, -1).join(' ');
          const result = `${deviceName}+${osVersion}`;
          console.log(`✅ Extracted device: ${result}`);
          return result;
        } else {
          // Fallback: use last part as version, rest as device name
          const osVersion = deviceParts[deviceParts.length - 1];
          const deviceName = deviceParts.slice(0, -1).join(' ');
          const result = `${deviceName}+${osVersion}`;
          console.log(`✅ Extracted device (fallback): ${result}`);
          return result;
        }
      }
    }
  } else {
    console.log(`⚠️ Could not find artifact folder pattern in path: ${filePath}`);
  }
  
  console.log(`❌ No device match found, using default`);
  return 'Unknown Device';
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
    
    // Search all results
    const jsonFiles = findJsonFiles('./test-results');
    console.log(`📊 Found ${jsonFiles.length} JSON report files:`);
    jsonFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    
    const outputPath = 'appwright/aggregated-reports/combined-performance-report.json';
    
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
        
        // Extract platform and scenario info from path
        const { platformKey, scenarioKey } = extractPlatformAndScenario(filePath);
        const deviceKey = extractDeviceInfo(filePath);
        console.log(`📊 Extracted values: platformKey="${platformKey}", scenarioKey="${scenarioKey}", deviceKey="${deviceKey}"`);
        
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
    
    // Create aggregated-performance-report.json (same structure as combined-performance-report.json)
    const aggregatedReportPath = 'appwright/aggregated-reports/aggregated-performance-report.json';
    fs.writeFileSync(aggregatedReportPath, JSON.stringify(groupedResults, null, 2));
    
    // Create summary
    const summary = createSummary(groupedResults);
    fs.writeFileSync('appwright/aggregated-reports/summary.json', JSON.stringify(summary, null, 2));
    
    console.log(`✅ Combined report saved: ${summary.totalTests} tests across ${summary.devices.length} device configurations`);
    console.log('📋 Summary report saved to: appwright/aggregated-reports/summary.json');
    console.log('📋 Aggregated report saved to: appwright/aggregated-reports/aggregated-performance-report.json');
    
  } catch (error) {
    createFallbackReport('appwright/aggregated-reports/combined-performance-report.json', error);
  }
}

// Run the aggregation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  aggregateReports();
}
export { aggregateReports, findJsonFiles, extractPlatformAndScenario, extractDeviceInfo, processTestReport };

