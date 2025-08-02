export class PerformanceTracker {
    constructor() {
      this.timers = {};
    }
  
    addTimer(name, timer) {
        if (this.timers[name]) {
            console.log('Timer already exists', name);
            return;
        }
        this.timers[name] = timer;
    }
  
    async attachToTest(testInfo) {
      const metrics = {};
      let totalSeconds = 0;
      for (const [name, timer] of Object.entries(this.timers)) {
        metrics[name] = timer.getDuration();
        totalSeconds += timer.getDurationInSeconds();
      }
      metrics.totalTimeSeconds = totalSeconds;
  
      await testInfo.attach(`performance-metrics-${testInfo.title}`, {
        body: JSON.stringify(metrics),
        contentType: 'application/json'
      });
      console.log('metrics', metrics);
      return metrics;
    }
  }