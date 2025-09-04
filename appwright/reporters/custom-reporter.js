/* eslint-disable import/no-nodejs-modules */
import { PerformanceTracker } from './PerformanceTracker';
import fs from 'fs';
import path from 'path';

class CustomReporter {
  constructor() {
    this.metrics = [];
    this.sessions = []; // Array to store all session data
  }

  // We'll skip the onStdOut and onStdErr methods since the list reporter will handle those

  onTestEnd(test, result) {
    console.log(`\n🔍 onTestEnd called for test: ${test.title}`);
    console.log(`📊 Test status: ${result.status}`);
    console.log(`📊 Test duration: ${result.duration}ms`);
    // Look for session data in attachments (preferred method)
    console.log(`🔍 Total attachments: ${result.attachments.length}`);
    result.attachments.forEach((att, idx) => {
      console.log(`  ${idx}: ${att.name} (${att.contentType})`);
    });

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
        console.log(
          `✅ Captured session data for test: ${sessionData.sessionId}`,
        );
        console.log(
          `🔍 Project name from session data: ${sessionData.projectName}`,
        );
      } catch (error) {
        console.log(`❌ Error parsing session data: ${error.message}`);
      }
    } else {
      console.log(
        `❌ No session-data attachment found in ${result.attachments.length} attachments`,
      );
    }

    // Fallback: Try to capture session ID from test result annotations
    if (result.annotations) {
      const sessionIdAnnotation = result.annotations.find(
        (annotation) => annotation.type === 'sessionId',
      );
      if (sessionIdAnnotation) {
        const sessionId = sessionIdAnnotation.description;
        console.log(`✅ Captured session ID from annotations: ${sessionId}`);

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

    // Look for metrics in the attachments
    const metricsAttachment = result.attachments.find(
      (att) => att.name && att.name.includes('performance-metrics'),
    );

    if (metricsAttachment && metricsAttachment.body) {
      try {
        const metrics = JSON.parse(metricsAttachment.body.toString());

        // Add a separator to make the metrics stand out in the logs
        console.log('\n📊 Performance Metrics for:', test.title);
        console.log('─'.repeat(50));

        Object.entries(metrics).forEach(([key, value]) => {
          if (key !== 'total' && key !== 'device') {
            console.log(`${key.padEnd(30)}: ${value} ms`);
          }
        });

        console.log('─'.repeat(50));
        console.log(`TOTAL TIME: ${metrics.total.toFixed(2)} seconds`);
        console.log('─'.repeat(50));

        this.metrics.push({
          testName: test.title,
          ...metrics,
        });
      } catch (error) {
        console.error('Error processing metrics:', error);
      }
    } else {
      console.log('❌ No performance metrics found in attachments');

      // For failed tests, still try to create a basic entry so we can capture video
      if (result.status !== 'passed') {
        console.log(
          `⚠️  Test failed (${result.status}), creating basic metrics entry`,
        );
        this.metrics.push({
          testName: test.title,
          total: result.duration / 1000, // Convert to seconds
          device: { name: 'Unknown', osVersion: 'Unknown' },
          testFailed: true,
          failureReason: result.status,
        });
      }
    }
  }

  async onEnd() {
    console.log(
      `\n🔍 onEnd called - Processing ${this.metrics.length} metrics entries and ${this.sessions.length} sessions`,
    );

    // Determine if this is a BrowserStack run by checking session data
    let isBrowserStackRun = false;

    // Check project names from session data (most reliable)
    if (this.sessions.length > 0) {
      const projectNames = this.sessions
        .map((session) => session.projectName)
        .filter(Boolean);

      console.log(`🔍 Project names from sessions: ${projectNames.join(', ')}`);
      isBrowserStackRun = projectNames.some((name) =>
        name.includes('browserstack-'),
      );
    }

    console.log(`🔍 isBrowserStackRun: ${isBrowserStackRun}`);
    console.log(`🔍 Sessions count: ${this.sessions.length}`);

    if (this.sessions.length > 0 && isBrowserStackRun) {
      console.log(
        `🎥 BrowserStack configuration detected - fetching video URLs...`,
      );
      const tracker = new PerformanceTracker();

      for (const session of this.sessions) {
        console.log(
          `🎬 Fetching video URL for session: ${session.sessionId} (${session.testTitle})`,
        );

        try {
          const videoURL = await tracker.getVideoURL(
            session.sessionId,
            60,
            3000,
          );
          if (videoURL) {
            session.videoURL = videoURL;
            console.log(
              `✅ Video URL fetched for ${session.testTitle}: ${videoURL}`,
            );
          } else {
            console.log(
              `❌ Video URL could not be fetched for ${session.testTitle}`,
            );
          }
        } catch (error) {
          console.error(
            `❌ Error fetching video URL for ${session.testTitle}:`,
            error.message,
          );
        }
      }
    } else if (this.sessions.length > 0 && !isBrowserStackRun) {
      console.log(
        `📱 Local/emulator run detected - skipping video URL fetching (BrowserStack only feature)`,
      );
    } else {
      console.log('❌ No session data available for video URL fetching');
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

        // Save JSON metrics
        const jsonPath = path.join(
          reportsDir,
          `performance-metrics-${testName}-${this.metrics[0].device.name}.json`,
        );
        fs.writeFileSync(jsonPath, JSON.stringify(metricsWithVideo, null, 2));
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
            ${this.metrics
              .map(
                (test) => `
              <h2>${test.testName}</h2>
              <table>
                <tr>
                  <th>Steps</th>
                  <th>Time (ms)</th>
                </tr>
                ${Object.entries(test)
                  .filter(
                    ([key]) =>
                      key !== 'testName' &&
                      key !== 'device' &&
                      key !== 'videoURL' &&
                      key !== 'sessionId' &&
                      key !== 'testFailed' &&
                      key !== 'failureReason' &&
                      key !== 'note',
                  )
                  .map(([key, value]) => {
                    if (key === 'total') {
                      return `
                        <tr class="total">
                          <td>TOTAL TIME</td>
                          <td>${value} s</td>
                        </tr>
                      `;
                    }
                    return `
                      <tr>
                        <td>${key}</td>
                        <td>${value} ms</td>
                      </tr>
                    `;
                  })
                  .join('')}
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

        // Add each step (excluding testName, device, videoURL, sessionId, testFailed, failureReason, and note)
        Object.entries(test).forEach(([key, value]) => {
          if (
            key !== 'testName' &&
            key !== 'device' &&
            key !== 'videoURL' &&
            key !== 'sessionId' &&
            key !== 'testFailed' &&
            key !== 'failureReason' &&
            key !== 'note'
          ) {
            if (key === 'total') {
              // Add a separator line before total
              csvRows.push('---,---');
              csvRows.push(`TOTAL TIME (s),${value}`);
            } else {
              // Regular step with time in ms
              csvRows.push(`"${key}","${value}"`);
            }
          }
        });

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
