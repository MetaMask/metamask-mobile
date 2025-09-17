/* eslint-disable import/no-nodejs-modules */
import { PerformanceTracker } from './PerformanceTracker';
import { AppProfilingDataHandler } from './AppProfilingDataHandler';
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

    // Always try to fetch profiling data if we have sessions and credentials
    const hasCredentials =
      process.env.BROWSERSTACK_USERNAME && process.env.BROWSERSTACK_ACCESS_KEY;

    if (this.sessions.length > 0 && hasCredentials) {
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
          try {
            console.log(
              `🔍 Fetching profiling data for ${session.testTitle}...`,
            );
            const appProfilingHandler = new AppProfilingDataHandler();
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
                `✅ Profiling data fetched for ${session.testTitle}: ${
                  session.profilingSummary?.issues || 0
                } issues detected`,
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

          // Use device info from session if available, otherwise keep the existing device info
          const deviceInfo = matchingSession?.deviceInfo || metric.device;

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
            ${
              this.sessions.length > 0 &&
              this.sessions.some(
                (s) => s.profilingData && !s.profilingData.error,
              )
                ? `<div style="margin-top: 30px;">
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
                              <span style="font-size: 14px;">Avg: ${
                                session.profilingSummary.cpu.avg
                              }% | Max: ${
                          session.profilingSummary.cpu.max
                        }%</span>
                            </div>
                            <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #4caf50;">
                              <strong style="color: #4caf50;">Memory</strong><br>
                              <span style="font-size: 14px;">Avg: ${
                                session.profilingSummary.memory.avg
                              } MB | Max: ${
                          session.profilingSummary.memory.max
                        } MB</span>
                            </div>
                            <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #ff9800;">
                              <strong style="color: #ff9800;">Battery</strong><br>
                              <span style="font-size: 14px;">${
                                session.profilingSummary.battery.total
                              } mAh (${(
                          session.profilingSummary.battery.percentage * 100
                        ).toFixed(1)}%)</span>
                            </div>
                            <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #9c27b0;">
                              <strong style="color: #9c27b0;">UI Performance</strong><br>
                              <span style="font-size: 14px;">Slow Frames: ${
                                session.profilingSummary.uiRendering.slowFrames
                              }% | ANRs: ${
                          session.profilingSummary.uiRendering.anrs
                        }</span>
                            </div>
                            <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #607d8b;">
                              <strong style="color: #607d8b;">Disk I/O</strong><br>
                              <span style="font-size: 14px;">Reads: ${
                                session.profilingSummary.diskIO.reads
                              } KB | Writes: ${
                          session.profilingSummary.diskIO.writes
                        } KB</span>
                            </div>
                            <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #795548;">
                              <strong style="color: #795548;">Network I/O</strong><br>
                              <span style="font-size: 14px;">Upload: ${
                                session.profilingSummary.networkIO.upload
                              } KB | Download: ${
                          session.profilingSummary.networkIO.download
                        } KB</span>
                            </div>
                          </div>
                          ${
                            session.profilingSummary.issues > 0
                              ? `
                            <div style="margin-top: 15px; padding: 15px; background-color: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
                              <strong style="color: #856404;">⚠️ Performance Issues Detected (${
                                session.profilingSummary.issues
                              })</strong>
                              <ul style="margin: 10px 0; padding-left: 20px;">
                                ${session.profilingData.data[
                                  'io.metamask'
                                ].detected_issues
                                  .map(
                                    (issue) => `
                                  <li style="margin-bottom: 10px;">
                                    <strong style="color: #856404;">${
                                      issue.title
                                    }</strong><br>
                                    <span style="font-size: 14px; color: #6c757d;">${
                                      issue.subtitle
                                    }</span><br>
                                    <span style="font-size: 13px; color: #dc3545;">Current: ${
                                      issue.current
                                    } ${issue.unit} | Recommended: ${
                                      issue.recommended
                                    } ${issue.unit}</span>
                                    ${
                                      issue.link
                                        ? `<br><a href="${issue.link}" target="_blank" style="font-size: 12px; color: #007bff;">Learn more</a>`
                                        : ''
                                    }
                                  </li>
                                `,
                                  )
                                  .join('')}
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
                   </div>`
                : this.sessions.length > 0 &&
                  this.sessions.some((s) => s.profilingData?.error)
                ? `<div style="margin-top: 30px;">
                    <h3>📊 App Profiling Analysis</h3>
                    <div style="padding: 15px; background-color: #f8d7da; border-radius: 6px; border-left: 4px solid #dc3545;">
                      <strong style="color: #721c24;">⚠️ Profiling Data Unavailable</strong>
                      <p style="margin: 5px 0 0 0; font-size: 14px; color: #721c24;">Some sessions encountered errors while fetching profiling data.</p>
                    </div>
                   </div>`
                : ''
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

        // Add each step based on structure (new array format, old object format, or legacy format)
        if (test.steps && Array.isArray(test.steps)) {
          // New array structure with steps
          test.steps.forEach((stepObject) => {
            const [stepName, duration] = Object.entries(stepObject)[0];
            const cpuAvg = profilingSummary?.cpu?.avg || 'N/A';
            const memoryAvg = profilingSummary?.memory?.avg || 'N/A';
            const battery = profilingSummary?.battery?.total || 'N/A';
            const issues = profilingSummary?.issues || 'N/A';
            csvRows.push(
              `"${stepName}","${duration}","${cpuAvg}","${memoryAvg}","${battery}","${issues}"`,
            );
          });
        } else if (test.steps && typeof test.steps === 'object') {
          // Backward compatibility for old object structure
          Object.entries(test.steps).forEach(([stepName, duration]) => {
            const cpuAvg = profilingSummary?.cpu?.avg || 'N/A';
            const memoryAvg = profilingSummary?.memory?.avg || 'N/A';
            const battery = profilingSummary?.battery?.total || 'N/A';
            const issues = profilingSummary?.issues || 'N/A';
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
        if (profilingSummary && !profilingSummary.error) {
          csvRows.push('---,---,---,---,---,---');
          csvRows.push('PROFILING SUMMARY,,,,,');
          csvRows.push(`CPU Avg,${profilingSummary.cpu.avg}%,,,,`);
          csvRows.push(`CPU Max,${profilingSummary.cpu.max}%,,,,`);
          csvRows.push(`Memory Avg,${profilingSummary.memory.avg} MB,,,,`);
          csvRows.push(`Memory Max,${profilingSummary.memory.max} MB,,,,`);
          csvRows.push(
            `Battery Usage,${profilingSummary.battery.total} mAh,,,,`,
          );
          csvRows.push(
            `Battery %,${(profilingSummary.battery.percentage * 100).toFixed(
              1,
            )}%,,,,`,
          );
          csvRows.push(
            `Slow Frames,${profilingSummary.uiRendering.slowFrames}%,,,,`,
          );
          csvRows.push(`ANRs,${profilingSummary.uiRendering.anrs},,,,`);
          csvRows.push(`Disk Reads,${profilingSummary.diskIO.reads} KB,,,,`);
          csvRows.push(`Disk Writes,${profilingSummary.diskIO.writes} KB,,,,`);
          csvRows.push(
            `Network Upload,${profilingSummary.networkIO.upload} KB,,,,`,
          );
          csvRows.push(
            `Network Download,${profilingSummary.networkIO.download} KB,,,,`,
          );
          csvRows.push(`Performance Issues,${profilingSummary.issues},,,,`);
          csvRows.push(
            `Critical Issues,${profilingSummary.criticalIssues},,,,`,
          );
        }

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
