/* eslint-disable import/no-nodejs-modules */
import { PerformanceTracker } from './PerformanceTracker';
import fs from 'fs';
import path from 'path';

class CustomReporter {
  constructor() {
    this.metrics = [];
    this.sessions = []; // Array to store all session data
    this.processedTests = new Set(); // Track processed tests to avoid duplicates
  }

  // We'll skip the onStdOut and onStdErr methods since the list reporter will handle those

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

    console.log(`\n🔍 Processing test: ${test.title} (${result.status})`);

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
            testStatus: result.status,
            testDuration: result.duration,
            timestamp: new Date().toISOString(),
          });
        }
      }
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
          ...metrics,
        };

        // Always mark failed tests appropriately
        if (result.status !== 'passed') {
          metricsEntry.testFailed = true;
          metricsEntry.failureReason = result.status;
        }

        // Ensure consistent device info for all metrics
        const deviceInfo = this.getDeviceInfo(test, result);
        metricsEntry.device = deviceInfo;

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

        this.metrics.push(metricsEntry);
      } catch (error) {
        console.error('Error processing metrics:', error);
      }
    } else if (result.status !== 'passed') {
      // For failed tests without metrics, create a basic entry
      console.log(`⚠️ Test failed without metrics, creating basic entry`);

      const deviceInfo = this.getDeviceInfo(test, result);

      const basicEntry = {
        testName: test.title,
        total: result.duration / 1000,
        device: deviceInfo,
        steps: [],
        testFailed: true,
        failureReason: result.status,
        note: 'Test failed - no performance metrics collected',
      };

      this.metrics.push(basicEntry);
    }
  }

  getDeviceInfo(test, result) {
    // Try to get device info from test project configuration first
    if (test?.parent?.project?.use?.device) {
      return test.parent.project.use.device;
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

    // Last resort fallback
    return {
      name: 'Unknown',
      osVersion: 'Unknown',
      provider: 'unknown',
    };
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

    if (this.sessions.length > 0 && isBrowserStackRun) {
      console.log(
        `🎥 Fetching video URLs for ${this.sessions.length} sessions`,
      );
      const tracker = new PerformanceTracker();

      for (const session of this.sessions) {
        try {
          const videoURL = await tracker.getVideoURL(
            session.sessionId,
            60,
            3000,
          );
          if (videoURL) {
            session.videoURL = videoURL;
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
        // Add video URLs to metrics by matching test names with sessions
        const metricsWithVideo = this.metrics.map((metric) => {
          const matchingSession = this.sessions.find(
            (session) => session.testTitle === metric.testName,
          );
          return {
            ...metric,
            videoURL: matchingSession?.videoURL || null,
            sessionId: matchingSession?.sessionId || null,
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
                  <th>Time (ms)</th>
                </tr>
                ${
                  test.steps && Array.isArray(test.steps)
                    ? // New array structure with steps
                      test.steps
                        .map((stepObject) => {
                          const [stepName, duration] =
                            Object.entries(stepObject)[0];
                          return `
                        <tr>
                          <td>${stepName}</td>
                          <td>${duration} ms</td>
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
                        </tr>
                      `,
                        )
                        .join('')
                }
                <tr class="total">
                  <td>TOTAL TIME</td>
                  <td>${test.total} s</td>
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
        console.log(`✅ Performance metrics saved: ${jsonPath}`);
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
        csvRows.push('Step,Time (ms)');

        // Add each step based on structure (new array format, old object format, or legacy format)
        if (test.steps && Array.isArray(test.steps)) {
          // New array structure with steps
          test.steps.forEach((stepObject) => {
            const [stepName, duration] = Object.entries(stepObject)[0];
            csvRows.push(`"${stepName}","${duration}"`);
          });
        } else if (test.steps && typeof test.steps === 'object') {
          // Backward compatibility for old object structure
          Object.entries(test.steps).forEach(([stepName, duration]) => {
            csvRows.push(`"${stepName}","${duration}"`);
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
              csvRows.push(`"${key}","${value}"`);
            }
          });
        }

        // Add total time regardless of structure
        csvRows.push('---,---');
        csvRows.push(`TOTAL TIME (s),${test.total}`);

        // Add failure information if this was a failed test
        if (test.testFailed) {
          csvRows.push('---,---');
          csvRows.push(`TEST STATUS,FAILED`);
          if (test.failureReason) {
            csvRows.push(`FAILURE REASON,${test.failureReason}`);
          }
          if (test.note) {
            csvRows.push(`NOTE,"${test.note}"`);
          }
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
    } catch (error) {
      console.error('Error generating performance report:', error);
    }
  }
}

export default CustomReporter;
