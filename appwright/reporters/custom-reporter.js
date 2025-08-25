/* eslint-disable import/no-nodejs-modules */
import fs from 'fs';
import path from 'path';

class CustomReporter {
  constructor() {
    this.metrics = [];
  }

  // We'll skip the onStdOut and onStdErr methods since the list reporter will handle those

  onTestEnd(test, result) {
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
    }
  }

  onEnd() {
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
        // Save JSON metrics
        const jsonPath = path.join(
          reportsDir,
          `performance-metrics-${testName}-${this.metrics[0].device.name}.json`,
        );
        fs.writeFileSync(jsonPath, JSON.stringify(this.metrics, null, 2));
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
                  .filter(([key]) => key !== 'testName')
                  .map(([key, value]) => {
                    if (key === 'total') {
                      return `
                        <tr class="total">
                          <td>TOTAL TIME</td>
                          <td>${value} s</td>
                        </tr>
                      `;
                    }
                    if (key !== 'device') {
                      return `
                      <tr>
                        <td>${key}</td>
                        <td>${value} ms</td>
                      </tr>
                    `;
                    }
                    return ''; // Return empty string for device key
                  })
                  .join('')}
              </table>
            `,
              )
              .join('')}
            <p><small>Generated: ${new Date().toLocaleString()}</small></p>
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
        csvRows.push(''); // Blank line for readability

        // Add column headers
        csvRows.push('Step,Time (ms)');

        // Add each step (excluding testName and device)
        Object.entries(test).forEach(([key, value]) => {
          if (key !== 'testName' && key !== 'device') {
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
