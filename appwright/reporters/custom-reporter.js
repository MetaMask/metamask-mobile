// reporters/custom-reporter.js
class CustomReporter {
  constructor() {
    this.metrics = [];
  }

  // We'll skip the onStdOut and onStdErr methods since the list reporter will handle those

  onTestEnd(test, result) {
    // Look for metrics in the attachments
    const metricsAttachment = result.attachments.find(
      att => att.name && att.name.includes('performance-metrics')
    );

    if (metricsAttachment && metricsAttachment.body) {
      try {
        const metrics = JSON.parse(metricsAttachment.body.toString());
        
        // Add a separator to make the metrics stand out in the logs
        console.log('\n📊 Performance Metrics for:', test.title);
        console.log('─'.repeat(50));
        
        Object.entries(metrics).forEach(([key, value]) => {
          if (key !== 'total') {
            console.log(`${key.padEnd(30)}: ${value}ms`);
          }
        });
        
        console.log('─'.repeat(50));
        console.log(`TOTAL TIME: ${metrics.total.toFixed(2)} seconds`);
        console.log('─'.repeat(50));
        
        this.metrics.push({
          testName: test.title,
          ...metrics
        });
      } catch (error) {
        console.error('Error processing metrics:', error);
      }
    }
  }

  onEnd() {
    const fs = require('fs');
    const path = require('path');
    
    try {
      // Ensure reports directory exists
      const reportsDir = path.join(__dirname, 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      if (this.metrics.length > 0) {
        // Create a timestamp for unique filenames
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
        const testName = this.metrics[0].testName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        
        // Save JSON metrics
        const jsonPath = path.join(reportsDir, `performance-metrics-${testName}-${timestamp}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(this.metrics, null, 2));
        
        // Generate HTML report
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Performance Metrics: ${testName}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background-color: #4CAF50; color: white; }
              tr:nth-child(even) { background-color: #f2f2f2; }
              .total { font-weight: bold; background-color: #e7f3e7; }
            </style>
          </head>
          <body>
            <h1>Performance Report</h1>
            ${this.metrics.map(test => `
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
                    return `
                      <tr>
                        <td>${key}</td>
                        <td>${value}ms</td>
                      </tr>
                    `;
                  }).join('')}
              </table>
            `).join('')}
            <p><small>Generated: ${new Date().toLocaleString()}</small></p>
          </body>
          </html>
        `;
        
        const reportPath = path.join(reportsDir, `performance-report-${testName}-${timestamp}.html`);
        fs.writeFileSync(reportPath, html);
        
        console.log(`\n✅ Performance report generated: ${reportPath}`);
        console.log(`✅ Performance metrics saved: ${jsonPath}`);
      }
    } catch (error) {
      console.error('Error generating performance report:', error);
    }
  }
}

module.exports = CustomReporter;