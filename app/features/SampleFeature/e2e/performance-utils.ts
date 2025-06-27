/**
 * Simple E2E Performance Metrics Collection
 * This version doesn't depend on native modules and works in Jest environment
 */

interface E2EPerformanceMetric {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, any>;
}

interface E2ETestSuiteMetrics {
  suiteName: string;
  testName: string;
  timestamp: string;
  metrics: E2EPerformanceMetric[];
  summary: {
    totalDuration: number;
    averageDuration: number;
    metricCount: number;
  };
}

class E2EPerformanceCollector {
  private metrics: E2EPerformanceMetric[] = [];
  private activeTimers: Map<string, number> = new Map();

  /**
   * Start timing a performance metric
   */
  startTimer(name: string, metadata?: Record<string, any>): void {
    if (this.activeTimers.has(name)) {
      console.warn(`Timer "${name}" is already running`);
      return;
    }
    
    this.activeTimers.set(name, Date.now());
    console.log(`⏱️  Started timing: ${name}`);
  }

  /**
   * End timing a performance metric
   */
  endTimer(name: string): number | null {
    const startTime = this.activeTimers.get(name);
    if (!startTime) {
      console.warn(`Timer "${name}" was not started`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const metric: E2EPerformanceMetric = {
      name,
      startTime,
      endTime,
      duration,
    };

    this.metrics.push(metric);
    this.activeTimers.delete(name);

    console.log(`⏱️  ${name}: ${duration}ms`);
    return duration;
  }

  /**
   * Measure a function execution time
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startTimer(name);
    try {
      const result = await fn();
      this.endTimer(name);
      return result;
    } catch (error) {
      this.endTimer(name);
      throw error;
    }
  }

  /**
   * Measure a synchronous function execution time
   */
  measureSync<T>(name: string, fn: () => T): T {
    this.startTimer(name);
    try {
      const result = fn();
      this.endTimer(name);
      return result;
    } catch (error) {
      this.endTimer(name);
      throw error;
    }
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): E2EPerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.activeTimers.clear();
    console.log('🧹 Performance metrics cleared');
  }

  /**
   * Generate a summary report
   */
  generateSummary(suiteName: string, testName: string): E2ETestSuiteMetrics {
    const totalDuration = this.metrics.reduce((sum, metric) => sum + metric.duration, 0);
    const averageDuration = this.metrics.length > 0 ? totalDuration / this.metrics.length : 0;

    const summary: E2ETestSuiteMetrics = {
      suiteName,
      testName,
      timestamp: new Date().toISOString(),
      metrics: [...this.metrics],
      summary: {
        totalDuration,
        averageDuration,
        metricCount: this.metrics.length,
      },
    };

    return summary;
  }

  /**
   * Print a formatted summary to console
   */
  printSummary(suiteName: string, testName: string): void {
    const summary = this.generateSummary(suiteName, testName);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 E2E PERFORMANCE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Suite: ${summary.suiteName}`);
    console.log(`Test: ${summary.testName}`);
    console.log(`Timestamp: ${summary.timestamp}`);
    console.log(`Total Metrics: ${summary.summary.metricCount}`);
    console.log(`Total Duration: ${summary.summary.totalDuration}ms`);
    console.log(`Average Duration: ${summary.summary.averageDuration.toFixed(2)}ms`);
    
    if (summary.metrics.length > 0) {
      console.log('\n📈 Individual Metrics:');
      summary.metrics.forEach((metric, index) => {
        console.log(`  ${index + 1}. ${metric.name}: ${metric.duration}ms`);
      });
    }
    
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Save metrics to a simple JSON file (for comparison across runs)
   */
  saveMetricsToFile(suiteName: string, testName: string): void {
    const summary = this.generateSummary(suiteName, testName);
    const fs = require('fs');
    const path = require('path');
    
    // Create output directory
    const outputDir = path.join(process.cwd(), 'e2e-performance-results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `e2e-performance-${suiteName}-${testName}-${timestamp}.json`;
    const filePath = path.join(outputDir, filename);
    
    // Write to file
    fs.writeFileSync(filePath, JSON.stringify(summary, null, 2));
    console.log(`💾 E2E Performance metrics saved to: ${filePath}`);
  }
}

// Global instance for easy access
export const e2ePerformance = new E2EPerformanceCollector();

/**
 * Utility functions for E2E tests
 */

/**
 * Clear performance metrics before starting a test
 * Call this in the beforeEach() hook of your test
 */
export const clearTestMetrics = () => {
  e2ePerformance.clearMetrics();
};

/**
 * Save performance metrics at the end of a test suite
 * Call this in the afterAll() hook of your test suite
 */
export const saveTestSuiteMetrics = async (suiteName: string, testName?: string) => {
  const testNameToUse = testName || 'unknown-test';
  e2ePerformance.printSummary(suiteName, testNameToUse);
  e2ePerformance.saveMetricsToFile(suiteName, testNameToUse);
};

/**
 * Measure a specific action or operation
 * Use this to wrap operations you want to measure
 */
export const measureAction = async <T>(name: string, action: () => Promise<T>): Promise<T> => {
  return e2ePerformance.measureAsync(name, action);
};

/**
 * Measure a synchronous action or operation
 */
export const measureActionSync = <T>(name: string, action: () => T): T => {
  return e2ePerformance.measureSync(name, action);
}; 