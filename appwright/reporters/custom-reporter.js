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
        if (key !== 'totalTimeSeconds') {
          console.log(`${key.padEnd(30)}: ${value}ms`);
        }
      });
      
      console.log('─'.repeat(50));
      console.log(`TOTAL TIME: ${metrics.totalTimeSeconds.toFixed(2)} seconds`);
      console.log('─'.repeat(50));
      
      this.metrics.push({
        testName: test.title,
        ...metrics
      });
    }
  }

  onEnd() {
    // Guardar métricas en un archivo JSON
    const fs = require('fs');
    fs.writeFileSync(
      `performance-metrics-${this.metrics[0].testName}.json`, 
      JSON.stringify(this.metrics, null, 2)
    );
    console.log('this.metrics', this.metrics);
    
    // Generar reporte HTML básico
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Scenario: Javi</title>
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
              <th>Screen</th>
              <th>Time (ms)</th>
            </tr>
            ${Object.entries(test).map(([key, value]) => `
              <tr>
                <td>${key}</td>
                <td>${value}ms</td>
              </tr>
            `).join('')}
          </table>
        `).join('')}
      </body>
      </html>
    `;
    
    fs.writeFileSync(`performance-report-${this.metrics[0].testName}.html`, html);
    console.log('\n✅ Performance report generated: performance-report.html');
  }
}

module.exports = CustomReporter;