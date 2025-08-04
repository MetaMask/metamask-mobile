// reporters/simple-onboarding-reporter.js
class CustomReporter {
  constructor() {
    this.metrics = [];
  }

  onTestEnd(test, result) {
    // Buscar métricas en los attachments
    const metricsAttachment = result.attachments.find(
      att => att.name.includes('performance-metrics')
    );

    if (metricsAttachment) {
      const metrics = JSON.parse(metricsAttachment.body.toString());
      
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
    }
  }

  onEnd() {
    const fs = require('fs');
    const path = require('path'); // Make sure this comes before using `path`
    // Ensure directory exists
    const reportsDir = path.join(__dirname,'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    if (this.metrics.length > 0) {
      fs.writeFileSync(
        path.join(reportsDir, `performance-metrics-${this.metrics[0].testName}.json`),
        JSON.stringify(this.metrics, null, 2)
      );

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Scenario: Metrics </title>
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
              ${Object.entries(test).map(([key, value]) => {
                if (key !== 'testName') {
                  return `
                <tr>
                  <td>${key}</td>
                  <td>${value}ms</td>
                </tr>
              `;
                }
              }).join('')}
            </table>
          `).join('')}
        </body>
        </html>
      `;
      const reportPath = `./appwright/reporters/reports/performance-report-${this.metrics[0].testName}.html`;
      fs.writeFileSync(reportPath, html);
      console.log(`\n✅ Performance report generated: ${reportPath}`);
    }
  }
}

module.exports = CustomReporter;