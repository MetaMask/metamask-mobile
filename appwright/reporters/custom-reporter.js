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
}

export default CustomReporter;
