/* eslint-disable import/no-nodejs-modules */
import { PerformanceTracker } from './PerformanceTracker';
import fs from 'fs';
import path from 'path';

class CustomReporter {
  constructor() {
    this.metrics = [];
    this.videoURL = null;
    this.sessionId = null;
  }

  // We'll skip the onStdOut and onStdErr methods since the list reporter will handle those

  onTestEnd(test, result) {
    console.log(`\n🔍 onTestEnd called for test: ${test.title}`);
    console.log(`📊 Test status: ${result.status}`);
    console.log(`📊 Test duration: ${result.duration}ms`);

    // Try to capture session ID from test result as fallback
    if (!this.sessionId && result.annotations) {
      const sessionIdAnnotation = result.annotations.find(
        (annotation) => annotation.type === 'sessionId',
      );
      if (sessionIdAnnotation) {
        this.sessionId = sessionIdAnnotation.description;
        console.log(
          `✅ Captured session ID from test result: ${this.sessionId}`,
        );
        // Store it for the custom reporter
        process.env.TEMP_SESSION_ID = this.sessionId;
        process.env.TEMP_TEST_TITLE = test.title;
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
      `\n🔍 onEnd called - Processing ${this.metrics.length} metrics entries`,
    );

    // Handle video URL fetching if we have stored session data
    this.sessionId = this.sessionId || process.env.TEMP_SESSION_ID;

    if (this.sessionId) {
      console.log(`🎬 Fetching video URL for session: ${this.sessionId}`);
      const tracker = new PerformanceTracker();

      try {
        this.videoURL = await tracker.getVideoURL(this.sessionId, 60, 3000);
        if (this.videoURL) {
          console.log('✅ Video URL fetched successfully:', this.videoURL);
        } else {
          console.log(
            '❌ Video URL could not be fetched (but session ID was valid)',
          );
        }
      } catch (error) {
        console.error('❌ Error fetching video URL:', error.message);
      }

      // Clean up session data
      delete process.env.TEMP_SESSION_ID;
      delete process.env.TEMP_TEST_TITLE;
    } else {
      console.log('❌ No session ID available for video URL fetching');
    }

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
        // Add video URL to metrics if available
        const metricsWithVideo = this.metrics.map((metric) => ({
          ...metric,
          videoURL: this.videoURL,
          sessionId: this.sessionId,
        }));

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
              this.sessionId
                ? `<p><small>Session ID: ${this.sessionId}</small></p>`
                : ''
            }
            ${
              this.videoURL
                ? `<p><strong>📹 Video Recording: <a href="${this.videoURL}" target="_blank">View Recording</a></strong></p>`
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
        if (this.sessionId) {
          csvRows.push(`Session ID: ${this.sessionId}`);
        }
        if (this.videoURL) {
          csvRows.push(`Video Recording: ${this.videoURL}`);
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
