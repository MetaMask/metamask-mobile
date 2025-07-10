/* eslint-disable no-console, import/no-nodejs-modules */
import fs from 'fs';
import path from 'path';

// Test results storage
export interface TestResult {
  testName: string;
  userProfile: string;
  platform: string;
  navigationTime?: number | string; // Can be number or descriptive text
  renderTime?: number | string; // Can be number or descriptive text
  totalTime: number;
  status: 'PASSED' | 'FAILED';
  error?: string;
  timestamp: string;
  thresholds: {
    navigation: number;
    render: number;
    total: number;
  };
  metadata?: {
    noNavigationTime?: boolean;
    noRenderTime?: boolean;
    testType?: string;
    measuredMetrics?: {
      totalTime: boolean;
      navigationTime?: boolean;
      renderTime?: boolean;
    };
  };
}

export interface TestSuiteResults {
  suiteName: string;
  startTime: string;
  endTime: string;
  platform: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
}

export class PerformanceTestReporter {
  private testSuiteResults: TestSuiteResults;

  constructor(suiteName: string) {
    this.testSuiteResults = {
      suiteName,
      startTime: new Date().toISOString(),
      endTime: '',
      platform: device.getPlatform().toUpperCase(),
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      results: [],
    };
  }

  /**
   * Initialize the test suite
   */
  initializeSuite(): void {
    console.warn(`\n🚀 STARTING ${this.testSuiteResults.suiteName.toUpperCase()}`);
    console.warn(`📱 Platform: ${this.testSuiteResults.platform}`);
    console.warn(`⏰ Start Time: ${this.testSuiteResults.startTime}`);
    console.warn('='.repeat(60));
  }

  /**
   * Finalize the test suite and save results
   */
  finalizeSuite(): void {
    this.testSuiteResults.endTime = new Date().toISOString();
    this.saveTestResults();
    console.warn(`\n🏁 FINISHED ${this.testSuiteResults.suiteName.toUpperCase()}`);
    console.warn(`⏰ End Time: ${this.testSuiteResults.endTime}`);
    console.warn('='.repeat(60));
  }

  /**
   * Convert milliseconds to seconds with 2 decimal places
   */
  private msToSeconds(ms: number): number {
    return Math.round((ms / 1000) * 100) / 100;
  }

  /**
   * Add a passed test result
   */
  addPassedTest(
    testName: string,
    userProfile: string,
    result: Partial<TestResult>,
    _duration: number,
  ): void {
    // Handle tests that don't measure navigation/render times
    const hasNavigationTime = result.navigationTime !== undefined && result.navigationTime !== -1;
    const hasRenderTime = result.renderTime !== undefined && result.renderTime !== -1;

    const testResult: TestResult = {
      testName,
      userProfile,
      platform: this.testSuiteResults.platform,
      navigationTime: hasNavigationTime ? this.msToSeconds(result.navigationTime as number || 0) : 'Navigation time not measured for this test type',
      renderTime: hasRenderTime ? this.msToSeconds(result.renderTime as number || 0) : 'Render time not measured for this test type',
      totalTime: this.msToSeconds(result.totalTime || 0),
      status: 'PASSED',
      timestamp: new Date().toISOString(),
      thresholds: {
        navigation: this.msToSeconds(result.thresholds?.navigation || 0),
        render: this.msToSeconds(result.thresholds?.render || 0),
        total: this.msToSeconds(result.thresholds?.total || 0),
      },
    };

    // Add metadata for tests that don't measure navigation/render times
    if (!hasNavigationTime || !hasRenderTime) {
      testResult.metadata = {
        noNavigationTime: !hasNavigationTime,
        noRenderTime: !hasRenderTime,
        testType: 'action-only', // Indicates this test only measures action time
        measuredMetrics: {
          totalTime: true,
          ...(hasNavigationTime && { navigationTime: true }),
          ...(hasRenderTime && { renderTime: true }),
        },
      };
    }

    this.testSuiteResults.results.push(testResult);
    this.testSuiteResults.passedTests++;
    this.testSuiteResults.totalTests++;
  }

  /**
   * Add a failed test result
   */
  addFailedTest(
    testName: string,
    userProfile: string,
    error: unknown,
    duration: number,
  ): void {
    const testResult: TestResult = {
      testName,
      userProfile,
      platform: this.testSuiteResults.platform,
      totalTime: this.msToSeconds(duration),
      status: 'FAILED',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      thresholds: { navigation: 0, render: 0, total: 0 },
    };

    this.testSuiteResults.results.push(testResult);
    this.testSuiteResults.failedTests++;
    this.testSuiteResults.totalTests++;
  }

  /**
   * Save test results to JSON file
   */
  private saveTestResults(): void {
    const performanceDir = path.join(__dirname, '..', 'specs', 'performance');
    const reportsDir = path.join(performanceDir, 'reports');
    const outputFile = path.join(
      reportsDir,
      `${this.testSuiteResults.suiteName.toLowerCase().replace(/\s+/g, '-')}-performance-results.json`,
    );

    try {
      // Ensure reports directory exists
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      fs.writeFileSync(outputFile, JSON.stringify(this.testSuiteResults, null, 2));
      console.warn(`📊 Test results saved to: ${outputFile}`);
    } catch (error) {
      console.error(`Failed to save test results: ${error}`);
    }
  }

  /**
   * Get current test suite results
   */
  getTestSuiteResults(): TestSuiteResults {
    return this.testSuiteResults;
  }
}

/**
 * Helper function to create test iterations for different user profiles
 */
export const createUserProfileTests = (
  testName: string,
  testFunction: (userState: unknown) => Promise<Partial<TestResult>>,
  userStates: { name: string; state: unknown }[],
  reporter: PerformanceTestReporter,
) => {
  userStates.forEach(({ name, state }, index) => {
    it(`${testName} - ${name}`, async () => {
      // Use console.warn to ensure visibility in test output
      console.warn(
        `\n🚀 STARTING TEST BLOCK ${index + 1}/${
          userStates.length
        }: ${testName} - ${name}`,
      );
      console.warn(`📊 Test Details: ${testName} - ${name}`);
      console.warn(`⏰ Start Time: ${new Date().toISOString()}`);

      const startTime = Date.now();

      try {
        const result = await testFunction(state);
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Add passed test result
        reporter.addPassedTest(testName, name, result, duration);

        console.warn(
          `TEST BLOCK ${index + 1}/${
            userStates.length
          } PASSED: ${testName} - ${name}`,
        );
        console.warn(`⏱️  Total Duration: ${duration}ms`);
        console.warn(`⏰ End Time: ${new Date().toISOString()}`);
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Add failed test result
        reporter.addFailedTest(testName, name, error, duration);

        console.error(
          `TEST BLOCK ${index + 1}/${
            userStates.length
          } FAILED: ${testName} - ${name}`,
        );
        console.error(`⏱️  Duration: ${duration}ms`);
        console.error(
          `💥 Error: ${error instanceof Error ? error.message : String(error)}`,
        );

        throw error;
      }
    });
  });
}; 