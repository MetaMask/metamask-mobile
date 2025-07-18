/**
 * E2E Performance Metrics Collection using ReadOnlyPerformanceStore
 * This version follows the same pattern as the existing fixture system
 */

import ReadOnlyPerformanceStore from '../../app/util/test/performance-store';

interface PerformanceMetric {
  eventName: string;
  timestamp: number;
  duration?: number;
  metadata: Record<string, unknown>;
  id?: string;
  parentId?: string;
}

interface PerformanceSession {
  sessionId: string;
  startTime: number;
  environment: {
    branch: string;
    commitHash: string;
    platform: string;
    appVersion: string;
  };
}

interface PerformanceResult {
  suiteName: string;
  testName: string;
  timestamp: string;
  metrics: PerformanceMetric[];
  summary: {
    totalDuration: number;
    averageDuration: number;
    metricCount: number;
  };
  session: PerformanceSession;
}

class PerformanceCollector {
  private testStartTime: number = 0;
  private testName: string = '';
  private suiteName: string = '';

  constructor() {
    // No initialization needed - ReadOnlyPerformanceStore handles it
  }

  /**
   * Initialize performance collection for a test
   */
  initializeTest(suiteName: string, testName: string): void {
    this.suiteName = suiteName;
    this.testName = testName;
    this.testStartTime = Date.now();
    
    console.log(`⏱️  Started performance collection for: ${suiteName} - ${testName}`);
  }

  /**
   * Get performance metrics from the store
   */
  async getMetrics(): Promise<PerformanceMetric[]> {
    try {
      return await ReadOnlyPerformanceStore.getMetrics();
    } catch (error) {
      console.warn('❌ Could not get performance metrics:', error);
      return [];
    }
  }

  /**
   * Get performance session data from the store
   */
  async getSession(): Promise<PerformanceSession> {
    try {
      return await ReadOnlyPerformanceStore.getSession();
    } catch (error) {
      console.warn('❌ Could not get performance session:', error);
      return {
        sessionId: '',
        startTime: 0,
        environment: {
          branch: '',
          commitHash: '',
          platform: '',
          appVersion: '',
        },
      };
    }
  }

  /**
   * Generate a summary report from performance data
   */
  async generateSummary(): Promise<PerformanceResult> {
    const metrics = await this.getMetrics();
    const session = await this.getSession();
    
    // Ensure precise timing calculations
    const totalDuration = metrics.reduce((sum, metric) => sum + (metric.duration || 0), 0);
    const averageDuration = metrics.length > 0 ? totalDuration / metrics.length : 0;

    const summary: PerformanceResult = {
      suiteName: this.suiteName,
      testName: this.testName,
      timestamp: new Date().toISOString(),
      metrics: metrics.map(metric => ({
        ...metric,
        timestamp: Number(metric.timestamp),
        duration: Number(metric.duration || 0),
      })),
      summary: {
        totalDuration: Number(totalDuration.toFixed(3)),
        averageDuration: Number(averageDuration.toFixed(3)),
        metricCount: metrics.length,
      },
      session: {
        ...session,
        startTime: Number(session.startTime),
      },
    };

    return summary;
  }

  /**
   * Print a formatted summary to console
   */
  async printSummary(): Promise<void> {
    const summary = await this.generateSummary();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 E2E PERFORMANCE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Suite: ${summary.suiteName}`);
    console.log(`Test: ${summary.testName}`);
    console.log(`Timestamp: ${summary.timestamp}`);
    console.log(`Session ID: ${summary.session.sessionId}`);
    console.log(`Total Metrics: ${summary.summary.metricCount}`);
    console.log(`Total Duration: ${summary.summary.totalDuration.toFixed(3)}ms`);
    console.log(`Average Duration: ${summary.summary.averageDuration.toFixed(3)}ms`);
    
    if (summary.metrics.length > 0) {
      console.log('\n📈 Individual Metrics:');
      summary.metrics.forEach((metric, index) => {
        console.log(`  ${index + 1}. ${metric.eventName}: ${(metric.duration || 0).toFixed(3)}ms`);
        if (metric.metadata && Object.keys(metric.metadata).length > 0) {
          console.log(`     Metadata: ${JSON.stringify(metric.metadata)}`);
        }
      });
    }
    
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Save metrics to a JSON file (for comparison across runs)
   */
  async saveMetricsToFile(): Promise<void> {
    const summary = await this.generateSummary();
    const fs = require('fs');
    const path = require('path');
    
    // Create output directory
    const outputDir = path.join(process.cwd(), 'e2e-performance-results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `e2e-performance-${this.suiteName}-${this.testName}-${timestamp}.json`;
    const filePath = path.join(outputDir, filename);
    
    // Write to file
    fs.writeFileSync(filePath, JSON.stringify(summary, null, 2));
    console.log(`💾 E2E Performance metrics saved to: ${filePath}`);
  }
}

// Global instance for easy access
export const performanceCollector = new PerformanceCollector();

/**
 * Utility functions for E2E tests using performance tracking
 */

/**
 * Initialize performance collection for a test suite
 * Call this in the beforeAll() hook of your test suite
 */
export const initializePerformance = (suiteName: string, testName?: string) => {
  const testNameToUse = testName || 'unknown-test';
  performanceCollector.initializeTest(suiteName, testNameToUse);
};

/**
 * Save performance metrics at the end of a test suite
 * Call this in the afterAll() hook of your test suite
 */
export const saveTestSuitePerformanceMetrics = async (suiteName: string, testName?: string) => {
  const testNameToUse = testName || 'unknown-test';
  await performanceCollector.printSummary();
  await performanceCollector.saveMetricsToFile();
};

/**
 * Get current performance metrics
 * Use this to check metrics during a test
 */
export const getPerformanceMetrics = async () => {
  return await performanceCollector.getMetrics();
};

/**
 * Get current performance session
 * Use this to check session data during a test
 */
export const getPerformanceSession = async () => {
  return await performanceCollector.getSession();
};

/**
 * Wait for a specific performance metric to be recorded
 * Use this to wait for performance traces to complete
 */
export const waitForPerformanceMetric = async (
  eventName: string, 
  timeoutMs: number = 5000
): Promise<PerformanceMetric | null> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const metrics = await getPerformanceMetrics();
    const metric = metrics.find(m => m.eventName === eventName);
    
    if (metric) {
      return metric;
    }
    
    // Wait a bit before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.warn(`Timeout waiting for performance metric: ${eventName}`);
  return null;
};
