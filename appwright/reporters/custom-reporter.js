/* eslint-disable import/no-nodejs-modules */
import { PerformanceTracker } from './PerformanceTracker';
import { AppProfilingDataHandler } from './AppProfilingDataHandler';
import QualityGatesValidator from '../utils/QualityGatesValidator';
import { getTeamInfoFromTags } from '../config/teams-config.js';
import { clearQualityGateFailures } from '../utils/QualityGateError.js';
import fs from 'fs';
import path from 'path';

class CustomReporter {
  constructor() {
    this.metrics = [];
    this.sessions = []; // Array to store all session data
    this.processedTests = new Set(); // Track processed tests to avoid duplicates
    this.qualityGatesValidator = new QualityGatesValidator();
    this.failedTestsByTeam = {}; // Track failed tests grouped by team
  }

  // We'll skip the onStdOut and onStdErr methods since the list reporter will handle those

  /**
   * Called once before running tests.
   * Clears quality gate failures from previous test runs.
   */
  onBegin() {
    console.log(
      '🚀 Test suite starting: Clearing quality gate failures from previous runs...',
    );
    clearQualityGateFailures();
  }

  onTestEnd(test, result) {
    // Create a unique test identifier to avoid duplicate processing
    // Use test title and project name as unique ID
    const projectName = test?.parent?.project?.name || 'unknown';
    const testId = `${test.title}-${projectName}`;

    if (this.processedTests.has(testId)) {
      console.log(
        `⚠️ Test already processed, skipping: ${test.title} (${projectName})`,
      );
      return;
    }
    this.processedTests.add(testId);

    // Get team info from test tags (e.g., { tag: '@swap-bridge-dev-team' })
    // Tags can be in test.tags (Playwright 1.42+) or extracted from test title annotations
    let testTags = test.tags || [];

    // If tags is not an array, try to get from other sources
    if (!Array.isArray(testTags)) {
      testTags = [];
    }

    const testFilePath = test?.location?.file || '';
    const teamInfo = getTeamInfoFromTags(testTags);

    console.log(`\n🔍 Processing test: ${test.title} (${result.status})`);
    console.log(`👥 Team: ${teamInfo.teamName} (${teamInfo.teamId})`);
    console.log(
      `🏷️ Tags: ${testTags.length > 0 ? testTags.join(', ') : 'none (using default team)'}`,
    );

    const sessionAttachment = result.attachments.find(
      (att) => att.name === 'session-data',
    );

    if (sessionAttachment && sessionAttachment.body) {
      try {
        const sessionData = JSON.parse(sessionAttachment.body.toString());
        this.sessions.push({
          ...sessionData,
          testStatus: result.status,
          testDuration: result.duration,
          team: sessionData.team || teamInfo, // Use team from session data or fallback
        });
      } catch (error) {
        console.log(`❌ Error parsing session data: ${error.message}`);
      }
    }

    // Fallback: Try to capture session ID from test result annotations
    if (result.annotations) {
      const sessionIdAnnotation = result.annotations.find(
        (annotation) => annotation.type === 'sessionId',
      );
      if (sessionIdAnnotation) {
        const sessionId = sessionIdAnnotation.description;

        // Only add if we didn't already capture it from attachments
        if (!this.sessions.find((s) => s.sessionId === sessionId)) {
          this.sessions.push({
            sessionId,
            testTitle: test.title,
            testFilePath,
            testStatus: result.status,
            testDuration: result.duration,
            timestamp: new Date().toISOString(),
            team: teamInfo,
          });
        }
      }
    }

    // Track failed tests by team for Slack notification
    // Only include actual failures (failed, timedOut), not skipped or interrupted tests
    const isActualFailure =
      result.status === 'failed' || result.status === 'timedOut';
    if (isActualFailure) {
      const teamId = teamInfo.teamId;
      if (!this.failedTestsByTeam[teamId]) {
        this.failedTestsByTeam[teamId] = {
          team: teamInfo,
          tests: [],
        };
      }
      this.failedTestsByTeam[teamId].tests.push({
        testName: test.title,
        testFilePath,
        tags: testTags,
        status: result.status,
        duration: result.duration,
        projectName,
        // Will be populated later with quality gates info if available
        qualityGates: null,
        failureReason: null,
      });
    }

    // Look for metrics in the attachments (including fallback metrics)
    const metricsAttachment = result.attachments.find(
      (att) => att.name && att.name.includes('performance-metrics'),
    );

    if (metricsAttachment && metricsAttachment.body) {
      try {
        const metrics = JSON.parse(metricsAttachment.body.toString());

        // Check if this is a fallback metrics entry
        const isFallbackMetrics =
          metricsAttachment.name.includes('fallback') ||
          metrics.message ===
            'Performance metrics could not be properly attached';

        console.log(
          `📊 Processing metrics for: ${test.title} ${
            isFallbackMetrics ? '(fallback)' : ''
          }`,
        );

        // Create metrics entry with proper handling for both regular and fallback metrics
        const metricsEntry = {
          testName: test.title,
          testFilePath,
          tags: testTags,
          ...metrics,
        };

        // Mark actual failures (not skipped or interrupted tests)
        if (result.status === 'failed' || result.status === 'timedOut') {
          metricsEntry.testFailed = true;
          metricsEntry.failureReason = result.status;
        }

        // Ensure consistent device info for all metrics
        const deviceInfo = this.getDeviceInfo(test, result);
        metricsEntry.device = deviceInfo;

        // Ensure team info is included (from metrics or fallback)
        if (!metricsEntry.team) {
          metricsEntry.team = teamInfo;
        }

        // For fallback metrics, ensure we have proper structure for reporting
        if (isFallbackMetrics) {
          // Convert test duration to seconds if not already
          if (!metricsEntry.total && metricsEntry.testDuration) {
            metricsEntry.total = metricsEntry.testDuration / 1000;
          }

          // Ensure we have steps array for consistency
          if (!metricsEntry.steps) {
            metricsEntry.steps = [];
          }
        }

        // Validate quality gates using thresholds from timers
        if (metricsEntry.steps && metricsEntry.steps.length > 0) {
          const qualityGatesResult = this.qualityGatesValidator.validateMetrics(
            test.title,
            metricsEntry.steps,
            metricsEntry.total || 0,
            metricsEntry.totalThreshold || null,
          );
          metricsEntry.qualityGates = qualityGatesResult;

          // Log quality gates result to console
          if (qualityGatesResult.hasThresholds) {
            console.log(
              this.qualityGatesValidator.formatConsoleReport(
                qualityGatesResult,
              ),
            );
          }

          // Update failed test entry with quality gates info if this test failed
          if (metricsEntry.testFailed) {
            const updates = { qualityGates: qualityGatesResult };
            if (
              qualityGatesResult.hasThresholds &&
              !qualityGatesResult.passed
            ) {
              updates.failureReason = 'quality_gates_exceeded';
              updates.qualityGatesViolations = qualityGatesResult.violations;
            } else {
              updates.failureReason =
                metricsEntry.failureReason || 'test_error';
            }
            this.updateFailedTestEntry(
              teamInfo.teamId,
              test.title,
              projectName,
              updates,
            );
          }
        }

        this.metrics.push(metricsEntry);
      } catch (error) {
        console.error('Error processing metrics:', error);
      }
    } else if (result.status === 'failed' || result.status === 'timedOut') {
      // For actual failed tests without metrics, create a basic entry
      // Skip creating entries for skipped/interrupted tests
      console.log(`⚠️ Test failed without metrics, creating basic entry`);

      const deviceInfo = this.getDeviceInfo(test, result);

      const basicEntry = {
        testName: test.title,
        testFilePath,
        tags: testTags,
        total: result.duration / 1000,
        device: deviceInfo,
        steps: [],
        testFailed: true,
        failureReason: result.status,
        note: 'Test failed - no performance metrics collected',
        team: teamInfo,
      };

      this.metrics.push(basicEntry);

      // Update failed test entry with failure reason (no quality gates since no metrics)
      this.updateFailedTestEntry(teamInfo.teamId, test.title, projectName, {
        failureReason: result.status,
      });
    }
  }

  /**
   * Update a failed test entry with additional information
   * @param {string} teamId - The team ID
   * @param {string} testTitle - The test title
   * @param {string} projectName - The project name
   * @param {Object} updates - Object containing properties to update
   */
  updateFailedTestEntry(teamId, testTitle, projectName, updates) {
    if (!this.failedTestsByTeam[teamId]) {
      return;
    }
    const failedTest = this.failedTestsByTeam[teamId].tests.find(
      (t) => t.testName === testTitle && t.projectName === projectName,
    );
    if (failedTest) {
      Object.assign(failedTest, updates);
    }
  }

  getDeviceInfo(test, result) {
    // Try multiple possible paths for device info
    let deviceInfo = null;

    // Path 1: test.parent.project.use.device
    if (test?.parent?.project?.use?.device) {
      deviceInfo = test.parent.project.use.device;
    }
    // Path 2: test.project.use.device
    else if (test?.project?.use?.device) {
      deviceInfo = test.project.use.device;
    }
    // Path 3: test.use.device
    else if (test?.use?.device) {
      deviceInfo = test.use.device;
    }

    if (deviceInfo) {
      return deviceInfo;
    }

    // Fallback to environment variables
    if (
      process.env.BROWSERSTACK_DEVICE &&
      process.env.BROWSERSTACK_OS_VERSION
    ) {
      return {
        name: process.env.BROWSERSTACK_DEVICE,
        osVersion: process.env.BROWSERSTACK_OS_VERSION,
        provider: 'browserstack',
      };
    }

    return {
      name: 'Unknown',
      osVersion: 'Unknown',
      provider: 'unknown',
    };
  }

  /**
   * Try to extract device info from profiling data metadata
   * @param {Object} profilingData - The profiling data object
   * @returns {Object|null} Device info or null
   */
  getDeviceInfoFromProfiling(profilingData) {
    if (
      profilingData?.metadata?.device &&
      profilingData?.metadata?.os_version
    ) {
      return {
        name: profilingData.metadata.device,
        osVersion: profilingData.metadata.os_version,
        provider: 'browserstack',
      };
    }
    return null;
  }

  /**
   * Safely access nested object properties with null/undefined protection
   * @param {Object} obj - The object to access
   * @param {string} path - Dot-separated path (e.g., 'cpu.avg')
   * @param {*} defaultValue - Default value if path doesn't exist
   * @returns {*} The value at the path or default value
   */
  getNestedProperty(obj, path, defaultValue = 'N/A') {
    if (!obj || typeof obj !== 'object') return defaultValue;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (
        current === null ||
        current === undefined ||
        typeof current !== 'object'
      ) {
        return defaultValue;
      }
      current = current[key];
    }

    return current !== undefined && current !== null ? current : defaultValue;
  }

  /**
   * Check if profiling data is valid and not an error
   * @param {Object} profilingData - The profiling data object
   * @param {Object} profilingSummary - The profiling summary object
   * @returns {boolean} True if data is valid
   */
  isValidProfilingData(profilingData, profilingSummary) {
    return (
      profilingData &&
      !profilingData.error &&
      profilingSummary &&
      !profilingSummary.error &&
      typeof profilingSummary === 'object'
    );
  }

  async onEnd() {
    console.log(`\n📊 Generating reports for ${this.metrics.length} tests`);

    // Analyze the test results for better reporting
    const passedTests = this.metrics.filter((m) => !m.testFailed).length;
    const failedTests = this.metrics.filter((m) => m.testFailed).length;
    const testsWithSteps = this.metrics.filter(
      (m) => m.steps && m.steps.length > 0,
    ).length;
    const testsWithFallbackData = this.metrics.filter(
      (m) =>
        m.note &&
        (m.note.includes('failed') ||
          m.note.includes('no performance metrics')),
    ).length;

    // Determine if this is a BrowserStack run by checking session data
    let isBrowserStackRun = false;

    // Check project names from session data (most reliable)
    if (this.sessions.length > 0) {
      const projectNames = this.sessions
        .map((session) => session.projectName)
        .filter(Boolean);

      isBrowserStackRun = projectNames.some((name) =>
        name.includes('browserstack-'),
      );
    }

    // Always try to fetch profiling data if we have sessions and credentials
    const hasCredentials =
      process.env.BROWSERSTACK_USERNAME && process.env.BROWSERSTACK_ACCESS_KEY;

    if (this.sessions.length > 0 && hasCredentials && isBrowserStackRun) {
      console.log(
        `🎥 Fetching video URLs and profiling data for ${this.sessions.length} sessions`,
      );

      const tracker = new PerformanceTracker();

      for (const session of this.sessions) {
        try {
          // Fetch video URL
          const videoURL = await tracker.getVideoURL(
            session.sessionId,
            60,
            3000,
          );
          if (videoURL) {
            session.videoURL = videoURL;
          }

          // Fetch profiling data from BrowserStack API
          const appProfilingHandler = new AppProfilingDataHandler();
          try {
            console.log(
              `🔍 Fetching profiling data for ${session.testTitle}...`,
            );
            const profilingResult =
              await appProfilingHandler.fetchCompleteProfilingData(
                session.sessionId,
              );

            if (profilingResult.error) {
              console.log(`⚠️ ${profilingResult.error}`);
              session.profilingData = {
                error: profilingResult.error,
                timestamp: new Date().toISOString(),
              };
              session.profilingSummary = {
                error: profilingResult.error,
                timestamp: new Date().toISOString(),
              };
            } else {
              session.profilingData = profilingResult.profilingData;
              session.profilingSummary = profilingResult.profilingSummary;
              console.log(
                `✅ Profiling data fetched for ${
                  session.testTitle
                }: ${this.getNestedProperty(
                  session.profilingSummary,
                  'issues',
                  0,
                )} issues detected`,
              );
            }
          } catch (error) {
            console.log(
              `⚠️ Failed to fetch profiling data for ${session.testTitle}: ${error.message}`,
            );
            session.profilingData = {
              error: `Failed to fetch profiling data: ${error.message}`,
              timestamp: new Date().toISOString(),
            };
            session.profilingSummary = {
              error: `Failed to fetch profiling data: ${error.message}`,
              timestamp: new Date().toISOString(),
            };
          }

          // Fetch network logs from BrowserStack API
          try {
            console.log(`🌐 Fetching network logs for ${session.testTitle}...`);
            const networkLogsResult =
              await appProfilingHandler.fetchNetworkLogs(session.sessionId);

            if (networkLogsResult.error) {
              console.log(`⚠️ Network logs: ${networkLogsResult.error}`);
              session.networkLogs = null;
              session.networkLogsSummary = null;
            } else {
              session.networkLogs = networkLogsResult.logs;
              session.networkLogsSummary = networkLogsResult.summary;
              console.log(
                `✅ Network logs fetched for ${session.testTitle}: ${networkLogsResult.summary?.totalRequests || 0} requests, ${networkLogsResult.summary?.failedRequests || 0} failed`,
              );
            }
          } catch (error) {
            console.log(
              `⚠️ Failed to fetch network logs for ${session.testTitle}: ${error.message}`,
            );
            session.networkLogs = null;
            session.networkLogsSummary = null;
          }
        } catch (error) {
          console.error(`❌ Error fetching video URL for ${session.testTitle}`);
        }
      }
    }

    // Clean up any leftover environment variables
    delete process.env.TEMP_SESSION_ID;
    delete process.env.TEMP_TEST_TITLE;
    delete process.env.TEMP_PROJECT_NAME;

    // If we have a sessionId but no metrics (failed test scenario), create a minimal entry
    if (this.sessionId && this.metrics.length === 0) {
      console.log(
        '⚠️ No metrics but session ID exists - creating entry for failed test',
      );
      this.metrics.push({
        testName: process.env.TEMP_TEST_TITLE || 'Unknown Test',
        total: 0,
        device: { name: 'Unknown', osVersion: 'Unknown' },
        testFailed: true,
        note: 'Test failed - no performance metrics collected',
      });
    }

    // Create a timestamp for unique filenames
    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, '-')
      .replace(/\./g, '-');
    if (this.metrics.length === 0) {
      console.log('No metrics found');
      return;
    }

    const testName = this.metrics[0].testName
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 30);
    try {
      // Ensure reports directory exists
      const reportsDir = path.join(__dirname, 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      if (this.metrics.length > 0) {
        console.log('Metrics are:', this.metrics);
        // Add video URLs and profiling data to metrics by matching test names with sessions
        const metricsWithVideo = this.metrics.map((metric) => {
          const matchingSession = this.sessions.find(
            (session) => session.testTitle === metric.testName,
          );

          // Determine device info with fallbacks:
          // 1. Use existing device info if valid (not Unknown)
          // 2. Try to get from profiling data metadata
          // 3. Keep Unknown as last resort
          let deviceInfo = metric.device;

          if (
            deviceInfo?.name === 'Unknown' &&
            matchingSession?.profilingData
          ) {
            const profilingDeviceInfo = this.getDeviceInfoFromProfiling(
              matchingSession.profilingData,
            );
            if (profilingDeviceInfo) {
              deviceInfo = profilingDeviceInfo;
              console.log(
                `📱 Device info recovered from profiling: ${deviceInfo.name} (${deviceInfo.osVersion})`,
              );
            }
          }

          return {
            ...metric,
            device: deviceInfo,
            videoURL: matchingSession?.videoURL || null,
            sessionId: matchingSession?.sessionId || null,
            profilingData: matchingSession?.profilingData || null,
            profilingSummary: matchingSession?.profilingSummary || null,
          };
        });

        // Group metrics by device to create separate reports
        const metricsByDevice = {};
        metricsWithVideo.forEach((metric) => {
          const deviceKey = `${metric.device.name}-${metric.device.osVersion}`;
          if (!metricsByDevice[deviceKey]) {
            metricsByDevice[deviceKey] = {
              device: metric.device,
              metrics: [],
            };
          }
          metricsByDevice[deviceKey].metrics.push(metric);
        });

        // Create separate JSON files for each device
        Object.entries(metricsByDevice).forEach(([deviceKey, deviceData]) => {
          const safeDeviceName = deviceData.device.name.replace(
            /[^a-zA-Z0-9]/g,
            '_',
          );
          const jsonPath = path.join(
            reportsDir,
            `performance-metrics-${testName}-${safeDeviceName}-${deviceData.device.osVersion}.json`,
          );
          fs.writeFileSync(
            jsonPath,
            JSON.stringify(deviceData.metrics, null, 2),
          );
          console.log(`✅ Device-specific report saved: ${jsonPath}`);
        });
        // Generate HTML report
        /* eslint-disable */
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Performance Metrics: ${testName} - ${
              this.metrics[0].device
            }</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #e0e0e0; padding: 12px; text-align: left; }
              th { background-color: #2e7d32; color: white; }
              tr:nth-child(even) { background-color: #f5f5f5; }
              .total { font-weight: bold; background-color: #e8f5e8; }
            </style>
          </head>
          <body>
            <h1>Performance Report - ${
              this.metrics[0].device.name
            } - OS version: ${this.metrics[0].device.osVersion}</h1>
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h3>📊 Test Suite Summary</h3>
              <p><strong>Total Tests:</strong> ${this.metrics.length}</p>
              <p><strong>Passed:</strong> ${passedTests} | <strong>Failed:</strong> ${failedTests}</p>
              <p><strong>With Performance Data:</strong> ${testsWithSteps} | <strong>Fallback Data:</strong> ${testsWithFallbackData}</p>
              <p style="font-style: italic; color: #555;">
                ${
                  failedTests > 0
                    ? 'Failed tests are included in this report with available performance data collected until failure.'
                    : 'All tests completed successfully with full performance metrics.'
                }
              </p>
            </div>
            ${this.metrics
              .map(
                (test) => `
              <h2>${test.testName}</h2>
              <table>
                <tr>
                  <th>Steps</th>
                  <th>Duration</th>
                  <th>Threshold</th>
                  <th>Status</th>
                </tr>
                ${
                  test.steps && Array.isArray(test.steps)
                    ? test.steps
                        .map((stepObject) => {
                          // Handle new format with threshold info
                          if (stepObject.name !== undefined) {
                            const { name, duration, threshold, baseThreshold } =
                              stepObject;
                            const hasThreshold =
                              threshold !== null && threshold !== undefined;
                            const passed =
                              !hasThreshold || duration <= threshold;
                            const statusIcon = hasThreshold
                              ? passed
                                ? '✅'
                                : '❌'
                              : '—';
                            const rowStyle =
                              hasThreshold && !passed
                                ? 'background-color: #ffebee;'
                                : '';
                            const thresholdStr = hasThreshold
                              ? `${threshold}ms<br><small style="color: #666;">(base: ${baseThreshold}ms)</small>`
                              : '—';
                            return `
                        <tr style="${rowStyle}">
                          <td>${name}</td>
                          <td>${duration} ms</td>
                          <td>${thresholdStr}</td>
                          <td>${statusIcon}</td>
                        </tr>
                      `;
                          }
                          // Handle old format {stepName: duration}
                          const [stepName, duration] =
                            Object.entries(stepObject)[0];
                          return `
                        <tr>
                          <td>${stepName}</td>
                          <td>${duration} ms</td>
                          <td>—</td>
                          <td>—</td>
                        </tr>
                      `;
                        })
                        .join('')
                    : test.steps && typeof test.steps === 'object'
                      ? // Backward compatibility for old object structure
                        Object.entries(test.steps)
                          .map(
                            ([stepName, duration]) => `
                        <tr>
                          <td>${stepName}</td>
                          <td>${duration} ms</td>
                          <td>—</td>
                          <td>—</td>
                        </tr>
                      `,
                          )
                          .join('')
                      : // Fallback to old structure
                        Object.entries(test)
                          .filter(
                            ([key]) =>
                              key !== 'testName' &&
                              key !== 'device' &&
                              key !== 'videoURL' &&
                              key !== 'sessionId' &&
                              key !== 'testFailed' &&
                              key !== 'failureReason' &&
                              key !== 'note' &&
                              key !== 'total',
                          )
                          .map(
                            ([key, value]) => `
                        <tr>
                          <td>${key}</td>
                          <td>${value} ms</td>
                          <td>—</td>
                          <td>—</td>
                        </tr>
                      `,
                          )
                          .join('')
                }
                <tr class="total">
                  <td>TOTAL TIME</td>
                  <td>${test.total} s</td>
                  <td>${test.totalThreshold ? `${(test.totalThreshold / 1000).toFixed(2)} s` : '—'}</td>
                  <td>${test.totalThreshold ? (test.total * 1000 <= test.totalThreshold ? '✅' : '❌') : '—'}</td>
                </tr>
                ${
                  test.testFailed
                    ? `
                  <tr style="background-color: #ffebee; color: #c62828;">
                    <td><strong>TEST STATUS</strong></td>
                    <td><strong>FAILED</strong></td>
                  </tr>
                  ${
                    test.failureReason
                      ? `
                  <tr style="background-color: #ffebee;">
                    <td>Failure Reason</td>
                    <td>${test.failureReason}</td>
                  </tr>`
                      : ''
                  }
                  ${
                    test.note
                      ? `
                  <tr style="background-color: #ffebee;">
                    <td>Note</td>
                    <td>${test.note}</td>
                  </tr>`
                      : ''
                  }
                `
                    : ''
                }
              </table>
              ${
                test.qualityGates
                  ? this.qualityGatesValidator.generateHtmlSection(
                      test.qualityGates,
                    )
                  : ''
              }
            `,
              )
              .join('')}
            <p><small>Generated: ${new Date().toLocaleString()}</small></p>
            ${
              this.sessions.length > 0
                ? `<div>
                    <h3>📹 Video Recordings</h3>
                    ${this.sessions
                      .map(
                        (session) =>
                          `<p><strong>${session.testTitle}:</strong> ${
                            session.videoURL
                              ? `<a href="${session.videoURL}" target="_blank">View Recording</a> (${session.sessionId})`
                              : `No video available (${session.sessionId})`
                          }</p>`,
                      )
                      .join('')}
                   </div>`
                : '<p>No video recordings available</p>'
            }
            ${(() => {
              const hasValidProfilingData =
                this.sessions.length > 0 &&
                this.sessions.some(
                  (s) => s.profilingData && !s.profilingData.error,
                );
              const hasProfilingErrors =
                this.sessions.length > 0 &&
                this.sessions.some((s) => s.profilingData?.error);

              console.log(`\n🔍 HTML Profiling Section Debug:`);
              console.log(
                `  - Has valid profiling data: ${hasValidProfilingData}`,
              );
              console.log(`  - Has profiling errors: ${hasProfilingErrors}`);
              console.log(
                `  - Will show profiling section: ${
                  hasValidProfilingData || hasProfilingErrors
                }`,
              );

              if (hasValidProfilingData) {
                return `<div style="margin-top: 30px;">
                    <h3>📊 App Profiling Analysis</h3>
                    ${this.sessions
                      .filter(
                        (session) =>
                          session.profilingData && !session.profilingData.error,
                      )
                      .map(
                        (session) => `
                        <div style="border: 1px solid #ddd; margin: 15px 0; padding: 20px; border-radius: 8px; background-color: #f9f9f9;">
                          <h4 style="margin-top: 0; color: #2e7d32;">${
                            session.testTitle
                          }</h4>
                          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px;">
                            <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #2196f3;">
                              <strong style="color: #2196f3;">CPU Usage</strong><br>
                              <span style="font-size: 14px;">Avg: ${this.getNestedProperty(
                                session.profilingSummary,
                                'cpu.avg',
                                'N/A',
                              )}% | Max: ${this.getNestedProperty(
                                session.profilingSummary,
                                'cpu.max',
                                'N/A',
                              )}%</span>
                            </div>
                            <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #4caf50;">
                              <strong style="color: #4caf50;">Memory</strong><br>
                              <span style="font-size: 14px;">Avg: ${this.getNestedProperty(
                                session.profilingSummary,
                                'memory.avg',
                                'N/A',
                              )} MB | Max: ${this.getNestedProperty(
                                session.profilingSummary,
                                'memory.max',
                                'N/A',
                              )} MB</span>
                            </div>
                            <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #ff9800;">
                              <strong style="color: #ff9800;">Battery</strong><br>
                              <span style="font-size: 14px;">${this.getNestedProperty(
                                session.profilingSummary,
                                'battery.total',
                                'N/A',
                              )} mAh (${(
                                this.getNestedProperty(
                                  session.profilingSummary,
                                  'battery.percentage',
                                  0,
                                ) * 100
                              ).toFixed(1)}%)</span>
                            </div>
                            <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #9c27b0;">
                              <strong style="color: #9c27b0;">UI Performance</strong><br>
                              <span style="font-size: 14px;">Slow Frames: ${this.getNestedProperty(
                                session.profilingSummary,
                                'uiRendering.slowFrames',
                                'N/A',
                              )}% | ANRs: ${this.getNestedProperty(
                                session.profilingSummary,
                                'uiRendering.anrs',
                                'N/A',
                              )}</span>
                            </div>
                            <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #607d8b;">
                              <strong style="color: #607d8b;">Disk I/O</strong><br>
                              <span style="font-size: 14px;">Reads: ${this.getNestedProperty(
                                session.profilingSummary,
                                'diskIO.reads',
                                'N/A',
                              )} KB | Writes: ${this.getNestedProperty(
                                session.profilingSummary,
                                'diskIO.writes',
                                'N/A',
                              )} KB</span>
                            </div>
                            <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #795548;">
                              <strong style="color: #795548;">Network I/O</strong><br>
                              <span style="font-size: 14px;">Upload: ${this.getNestedProperty(
                                session.profilingSummary,
                                'networkIO.upload',
                                'N/A',
                              )} KB | Download: ${this.getNestedProperty(
                                session.profilingSummary,
                                'networkIO.download',
                                'N/A',
                              )} KB</span>
                            </div>
                          </div>
                          ${
                            this.getNestedProperty(
                              session.profilingSummary,
                              'issues',
                              0,
                            ) > 0
                              ? `
                            <div style="margin-top: 15px; padding: 15px; background-color: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
                              <strong style="color: #856404;">⚠️ Performance Issues Detected (${this.getNestedProperty(
                                session.profilingSummary,
                                'issues',
                                0,
                              )})</strong>
                              <ul style="margin: 10px 0; padding-left: 20px;">
                                ${(() => {
                                  // Access the detected issues directly since 'io.metamask' is a single key
                                  const detectedIssues =
                                    session.profilingData?.data?.['io.metamask']
                                      ?.detected_issues || [];
                                  console.log(
                                    `🔍 Debug detected issues for ${session.testTitle}:`,
                                    detectedIssues,
                                  );
                                  console.log(
                                    `🔍 Is array: ${Array.isArray(
                                      detectedIssues,
                                    )}`,
                                  );
                                  if (!Array.isArray(detectedIssues)) return '';

                                  return detectedIssues
                                    .map(
                                      (issue) => `
                                    <li style="margin-bottom: 10px;">
                                      <strong style="color: #856404;">${this.getNestedProperty(
                                        issue,
                                        'title',
                                        'Unknown Issue',
                                      )}</strong><br>
                                      <span style="font-size: 14px; color: #6c757d;">${this.getNestedProperty(
                                        issue,
                                        'subtitle',
                                        'No description available',
                                      )}</span><br>
                                      <span style="font-size: 13px; color: #dc3545;">Current: ${this.getNestedProperty(
                                        issue,
                                        'current',
                                        'N/A',
                                      )} ${this.getNestedProperty(
                                        issue,
                                        'unit',
                                        '',
                                      )} | Recommended: ${this.getNestedProperty(
                                        issue,
                                        'recommended',
                                        'N/A',
                                      )} ${this.getNestedProperty(
                                        issue,
                                        'unit',
                                        '',
                                      )}</span>
                                      ${
                                        this.getNestedProperty(issue, 'link')
                                          ? `<br><a href="${this.getNestedProperty(
                                              issue,
                                              'link',
                                            )}" target="_blank" style="font-size: 12px; color: #007bff;">Learn more</a>`
                                          : ''
                                      }
                                    </li>
                                  `,
                                    )
                                    .join('');
                                })()}
                              </ul>
                            </div>
                          `
                              : `
                            <div style="margin-top: 15px; padding: 15px; background-color: #d4edda; border-radius: 6px; border-left: 4px solid #28a745;">
                              <strong style="color: #155724;">✅ No Performance Issues Detected</strong>
                              <p style="margin: 5px 0 0 0; font-size: 14px; color: #155724;">All metrics are within recommended thresholds.</p>
                            </div>
                          `
                          }
                        </div>
                      `,
                      )
                      .join('')}
                   </div>`;
              } else if (hasProfilingErrors) {
                return `<div style="margin-top: 30px;">
                    <h3>📊 App Profiling Analysis</h3>
                    <div style="padding: 15px; background-color: #f8d7da; border-radius: 6px; border-left: 4px solid #dc3545;">
                      <strong style="color: #721c24;">⚠️ Profiling Data Unavailable</strong>
                      <p style="margin: 5px 0 0 0; font-size: 14px; color: #721c24;">Some sessions encountered errors while fetching profiling data.</p>
                    </div>
                   </div>`;
              } else {
                return '';
              }
            })()}
          </body>
          </html>
        `;
        /* eslint-enable */

        const reportPath = path.join(
          reportsDir,
          `performance-report-${testName}-${timestamp}.html`,
        );
        fs.writeFileSync(reportPath, html);

        console.log(`\n✅ Performance report generated: ${reportPath}`);
      }

      // CSV Export - Steps Performance Report
      // CSV Export - One table per scenario with steps and times
      const csvRows = [];
      for (let i = 0; i < this.metrics.length; i++) {
        const test = this.metrics[i];

        // Add scenario/test name as a header
        csvRows.push(`Test: ${test.testName}`);
        if (test.device) {
          csvRows.push(
            `Device: ${test.device.name} - OS: ${test.device.osVersion}`,
          );
        }
        if (this.sessions.length > 0) {
          csvRows.push('Video Recordings:');
          this.sessions.forEach((session, index) => {
            csvRows.push(`  ${index + 1}. ${session.testTitle}`);
            csvRows.push(`     Session ID: ${session.sessionId}`);
            if (session.videoURL) {
              csvRows.push(`     Video: ${session.videoURL}`);
            } else {
              csvRows.push(`     Video: Not available`);
            }
          });
        }
        csvRows.push(''); // Blank line for readability

        // Add column headers
        csvRows.push(
          'Step,Time (ms),CPU Avg (%),Memory Avg (MB),Battery (mAh),Issues',
        );

        // Get profiling data for this test
        const matchingSession = this.sessions.find(
          (session) => session.testTitle === test.testName,
        );
        const profilingSummary = matchingSession?.profilingSummary;
        const profilingData = matchingSession?.profilingData;

        // Add each step based on structure (new array format, old object format, or legacy format)
        if (test.steps && Array.isArray(test.steps)) {
          // New array structure with steps
          test.steps.forEach((stepObject) => {
            const [stepName, duration] = Object.entries(stepObject)[0];
            const cpuAvg = this.getNestedProperty(
              profilingSummary,
              'cpu.avg',
              'N/A',
            );
            const memoryAvg = this.getNestedProperty(
              profilingSummary,
              'memory.avg',
              'N/A',
            );
            const battery = this.getNestedProperty(
              profilingSummary,
              'battery.total',
              'N/A',
            );
            const issues = this.getNestedProperty(
              profilingSummary,
              'issues',
              'N/A',
            );
            csvRows.push(
              `"${stepName}","${duration}","${cpuAvg}","${memoryAvg}","${battery}","${issues}"`,
            );
          });
        } else if (test.steps && typeof test.steps === 'object') {
          // Backward compatibility for old object structure
          Object.entries(test.steps).forEach(([stepName, duration]) => {
            const cpuAvg = this.getNestedProperty(
              profilingSummary,
              'cpu.avg',
              'N/A',
            );
            const memoryAvg = this.getNestedProperty(
              profilingSummary,
              'memory.avg',
              'N/A',
            );
            const battery = this.getNestedProperty(
              profilingSummary,
              'battery.total',
              'N/A',
            );
            const issues = this.getNestedProperty(
              profilingSummary,
              'issues',
              'N/A',
            );
            csvRows.push(
              `"${stepName}","${duration}","${cpuAvg}","${memoryAvg}","${battery}","${issues}"`,
            );
          });
        } else {
          // Fallback to old format (excluding specific keys)
          Object.entries(test).forEach(([key, value]) => {
            if (
              key !== 'testName' &&
              key !== 'device' &&
              key !== 'videoURL' &&
              key !== 'sessionId' &&
              key !== 'testFailed' &&
              key !== 'failureReason' &&
              key !== 'note' &&
              key !== 'total'
            ) {
              const cpuAvg = profilingSummary?.cpu?.avg || 'N/A';
              const memoryAvg = profilingSummary?.memory?.avg || 'N/A';
              const battery = profilingSummary?.battery?.total || 'N/A';
              const issues = profilingSummary?.issues || 'N/A';
              csvRows.push(
                `"${key}","${value}","${cpuAvg}","${memoryAvg}","${battery}","${issues}"`,
              );
            }
          });
        }

        // Add total time regardless of structure
        csvRows.push('---,---,---,---,---,---');
        csvRows.push(`TOTAL TIME (s),${test.total},,,,`);

        // Add profiling summary if available
        if (this.isValidProfilingData(profilingData, profilingSummary)) {
          csvRows.push('---,---,---,---,---,---');
          csvRows.push('PROFILING SUMMARY,,,,,');
          csvRows.push(
            `CPU Avg,${this.getNestedProperty(
              profilingSummary,
              'cpu.avg',
              'N/A',
            )}%,,,,`,
          );
          csvRows.push(
            `CPU Max,${this.getNestedProperty(
              profilingSummary,
              'cpu.max',
              'N/A',
            )}%,,,,`,
          );
          csvRows.push(
            `Memory Avg,${this.getNestedProperty(
              profilingSummary,
              'memory.avg',
              'N/A',
            )} MB,,,,`,
          );
          csvRows.push(
            `Memory Max,${this.getNestedProperty(
              profilingSummary,
              'memory.max',
              'N/A',
            )} MB,,,,`,
          );
          csvRows.push(
            `Battery Usage,${this.getNestedProperty(
              profilingSummary,
              'battery.total',
              'N/A',
            )} mAh,,,,`,
          );
          csvRows.push(
            `Battery %,${(
              this.getNestedProperty(
                profilingSummary,
                'battery.percentage',
                0,
              ) * 100
            ).toFixed(1)}%,,,,`,
          );
          csvRows.push(
            `Slow Frames,${this.getNestedProperty(
              profilingSummary,
              'uiRendering.slowFrames',
              'N/A',
            )}%,,,,`,
          );
          csvRows.push(
            `ANRs,${this.getNestedProperty(
              profilingSummary,
              'uiRendering.anrs',
              'N/A',
            )},,,,`,
          );
          csvRows.push(
            `Disk Reads,${this.getNestedProperty(
              profilingSummary,
              'diskIO.reads',
              'N/A',
            )} KB,,,,`,
          );
          csvRows.push(
            `Disk Writes,${this.getNestedProperty(
              profilingSummary,
              'diskIO.writes',
              'N/A',
            )} KB,,,,`,
          );
          csvRows.push(
            `Network Upload,${this.getNestedProperty(
              profilingSummary,
              'networkIO.upload',
              'N/A',
            )} KB,,,,`,
          );
          csvRows.push(
            `Network Download,${this.getNestedProperty(
              profilingSummary,
              'networkIO.download',
              'N/A',
            )} KB,,,,`,
          );
          csvRows.push(
            `Performance Issues,${this.getNestedProperty(
              profilingSummary,
              'issues',
              'N/A',
            )},,,,`,
          );
          csvRows.push(
            `Critical Issues,${this.getNestedProperty(
              profilingSummary,
              'criticalIssues',
              'N/A',
            )},,,,`,
          );
        }

        // Add failure information if this was a failed test
        if (test.testFailed) {
          csvRows.push('---,---,---,---,---,---');
          csvRows.push(`TEST STATUS,FAILED,,,,`);
          if (test.failureReason) {
            csvRows.push(`FAILURE REASON,"${test.failureReason}",,,,`);
          }
          if (test.note) {
            csvRows.push(`NOTE,"${test.note}",,,,`);
          }
        }

        // Add quality gates information
        if (test.qualityGates) {
          const qgRows = this.qualityGatesValidator.generateCsvRows(
            test.qualityGates,
          );
          csvRows.push(...qgRows);
        }

        // Add spacing between tables (3 blank lines to clearly separate tables)
        if (i < this.metrics.length - 1) {
          csvRows.push('');
          csvRows.push('');
          csvRows.push('');
        }
      }

      // Add generation timestamp at the end
      csvRows.push('');
      csvRows.push('');
      csvRows.push(`Generated: ${new Date().toLocaleString()}`);

      // Write to single CSV file
      const csvPath = path.join(
        reportsDir,
        `performance-report-${testName}-${timestamp}.csv`,
      );
      fs.writeFileSync(csvPath, csvRows.join('\n'));
      console.log(`✅ Performance CSV report saved: ${csvPath}`);

      // Generate failed tests by team report for Slack notifications
      if (Object.keys(this.failedTestsByTeam).length > 0) {
        const failedTestsReport = {
          timestamp: new Date().toISOString(),
          totalFailedTests: Object.values(this.failedTestsByTeam).reduce(
            (acc, team) => acc + team.tests.length,
            0,
          ),
          teamsAffected: Object.keys(this.failedTestsByTeam).length,
          failedTestsByTeam: this.failedTestsByTeam,
        };

        const failedTestsPath = path.join(
          reportsDir,
          'failed-tests-by-team.json',
        );
        fs.writeFileSync(
          failedTestsPath,
          JSON.stringify(failedTestsReport, null, 2),
        );
        console.log(`🚨 Failed tests by team report saved: ${failedTestsPath}`);
        console.log(
          `   Total failed tests: ${failedTestsReport.totalFailedTests}`,
        );
        console.log(`   Teams affected: ${failedTestsReport.teamsAffected}`);

        // Log which teams have failed tests
        for (const [teamId, teamData] of Object.entries(
          this.failedTestsByTeam,
        )) {
          console.log(
            `   - ${teamData.team.teamName}: ${teamData.tests.length} failed test(s)`,
          );
        }
      } else {
        console.log(`✅ No failed tests to report by team`);
      }

      // Save network logs for each session
      const sessionsWithNetworkLogs = this.sessions.filter(
        (s) => s.networkLogs && s.networkLogs.length > 0,
      );

      if (sessionsWithNetworkLogs.length > 0) {
        const networkLogsDir = path.join(reportsDir, 'network-logs');
        if (!fs.existsSync(networkLogsDir)) {
          fs.mkdirSync(networkLogsDir, { recursive: true });
        }

        for (const session of sessionsWithNetworkLogs) {
          const safeTestName = session.testTitle
            .replace(/[^a-zA-Z0-9]/g, '_')
            .substring(0, 50);

          const networkLogsReport = {
            testTitle: session.testTitle,
            sessionId: session.sessionId,
            fetchedAt: new Date().toISOString(),
            summary: session.networkLogsSummary,
            logs: session.networkLogs,
          };

          const networkLogsPath = path.join(
            networkLogsDir,
            `network-logs-${safeTestName}-${session.sessionId}.json`,
          );
          fs.writeFileSync(
            networkLogsPath,
            JSON.stringify(networkLogsReport, null, 2),
          );
        }

        console.log(
          `🌐 Network logs saved for ${sessionsWithNetworkLogs.length} session(s) in ${networkLogsDir}`,
        );

        // Create a summary file with all network logs summaries
        const networkLogsSummaryReport = {
          timestamp: new Date().toISOString(),
          totalSessions: sessionsWithNetworkLogs.length,
          sessions: sessionsWithNetworkLogs.map((s) => ({
            testTitle: s.testTitle,
            sessionId: s.sessionId,
            summary: s.networkLogsSummary,
          })),
        };

        const summaryPath = path.join(
          networkLogsDir,
          'network-logs-summary.json',
        );
        fs.writeFileSync(
          summaryPath,
          JSON.stringify(networkLogsSummaryReport, null, 2),
        );
        console.log(`📊 Network logs summary saved: ${summaryPath}`);
      }
    } catch (error) {
      console.error('Error generating performance report:', error);
    }
  }
}

export default CustomReporter;
