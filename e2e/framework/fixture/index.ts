import { test as base, type FullProject } from '@playwright/test';
import { WebDriverConfig } from '../types';
import { createServiceProvider, type ServiceProvider } from '../services';
import { PerformanceTracker } from '../performance/PerformanceTracker';
import Timers from '../performance/Timers';
import { createLogger } from '../logger';

const logger = createLogger({ name: 'TestFixture' });

// Extend globalThis to include driver property
declare global {
  // eslint-disable-next-line no-var
  var driver: WebdriverIO.Browser | undefined;
}

interface TestLevelFixtures {
  /**
   * Device provider to be used for the test.
   * This creates and manages the device lifecycle for the test
   */
  deviceProvider: ServiceProvider;

  /**
   * The device instance that will be used for running the test.
   * This provides the functionality to interact with the device
   * during the test.
   */
  driver: WebdriverIO.Browser;

  /**
   * Performance tracker to be used for the test.
   * This tracks the performance of the test and attaches it to the test
   */
  performanceTracker: PerformanceTracker;
}

export const test = base.extend<TestLevelFixtures>({
  // eslint-disable-next-line no-empty-pattern
  deviceProvider: async ({}, use, testInfo) => {
    const deviceProvider = createServiceProvider(testInfo.project);
    await use(deviceProvider);
  },

  driver: async ({ deviceProvider }, use, testInfo) => {
    let webDriver: WebdriverIO.Browser | undefined;

    try {
      // Create driver and set up test context
      webDriver = await deviceProvider.getDriver();

      // Make driver globally accessible for utilities
      globalThis.driver = webDriver;

      // Add test metadata as annotations
      const deviceProviderName = (
        testInfo.project as FullProject<WebDriverConfig>
      ).use.device?.provider;

      testInfo.annotations.push(
        {
          type: 'providerName',
          description: deviceProviderName || 'unknown',
        },
        {
          type: 'sessionId',
          description: deviceProvider.sessionId || 'no-session',
        },
      );

      try {
        await deviceProvider.syncTestDetails?.({ name: testInfo.title });
      } catch (error) {
        logger.error('Failed to sync pre-test details:', error);
      }

      // Run the test
      await use(webDriver);
    } finally {
      // Cleanup happens even if test fails
      const testStatus = testInfo.status;
      const testError = testInfo.error?.message;

      try {
        // Sync final test status to provider (e.g., BrowserStack dashboard)
        // This must happen BEFORE session deletion to ensure reliable status reporting
        await deviceProvider.syncTestDetails?.({
          name: testInfo.title,
          status: testStatus,
          reason: testError,
        });
      } catch (error) {
        logger.error('Failed to sync test details:', error);
      }

      try {
        // Close WebDriver session
        if (webDriver) {
          await webDriver.deleteSession();
        }
      } catch (error) {
        logger.error('Failed to delete WebDriver session:', error);
      }

      try {
        // Clean up global driver reference
        delete globalThis.driver;
      } catch (error) {
        logger.error('Failed to clean up global driver:', error);
      }

      try {
        // Provider-specific cleanup (e.g., stop Appium server for emulator)
        await deviceProvider.cleanup?.();
      } catch (error) {
        logger.error('Provider cleanup failed:', error);
      }
    }
  },

  performanceTracker: async ({ deviceProvider: _ }, use, testInfo) => {
    // Reset timers from previous tests to prevent ID collisions and stale data
    Timers.resetTimers();

    const performanceTracker = new PerformanceTracker();
    await use(performanceTracker);

    // After test completes, handle performance metrics and session cleanup
    logger.info('🔍 Post-test cleanup: attaching performance metrics...');
    logger.debug(
      `📊 Found ${performanceTracker.getTimers().length} timers in tracker`,
    );

    if (performanceTracker.getTimers().length === 0) {
      logger.warn('No timers found in performance tracker');
    }

    // Always try to attach performance metrics, even if test failed
    try {
      const metrics = await performanceTracker.attachToTest(testInfo);
      logger.info(
        `✅ Performance metrics attached: ${
          metrics.steps.length
        } steps, ${metrics.total.toFixed(2)}s total`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`❌ Failed to attach performance metrics: ${errorMessage}`);
    }

    logger.info('🔍 Looking for session ID...');

    let sessionId = null;
    sessionId =
      testInfo?.annotations?.find(
        (annotation) => annotation.type === 'sessionId',
      )?.description ?? null;

    if (sessionId) {
      // Store session data as a test attachment for the reporter to find
      await testInfo.attach('session-data', {
        body: JSON.stringify({
          sessionId,
          testTitle: testInfo.title,
          projectName: testInfo.project.name,
          timestamp: new Date().toISOString(),
        }),
        contentType: 'application/json',
      });

      await performanceTracker.storeSessionData(sessionId, testInfo.title);
      logger.info(`✅ Session data stored: ${sessionId}`);
    } else {
      logger.warn('⚠️ No session ID found - video URL cannot be retrieved');
    }
  },
});
