export class PerformanceTracker {
  constructor() {
    this.timers = {};
  }

  addTimer(timer) {
    if (this.timers[timer.id]) {
      // eslint-disable-next-line no-console
      console.log('Timer already exists', timer.id);
      return;
    }
    this.timers[timer.id] = timer;
  }

  async attachToTest(testInfo) {
    const metrics = {};
    let totalSeconds = 0;
    for (const [id, timer] of Object.entries(this.timers)) {
      metrics[id] = timer.getDuration();
      totalSeconds += timer.getDurationInSeconds();
    }
    metrics.total = totalSeconds;
    metrics.device = testInfo.project.use.device;

    await testInfo.attach(`performance-metrics-${testInfo.title}`, {
      body: JSON.stringify(metrics),
      contentType: 'application/json',
    });
    return metrics;
  }
}
