/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import path from 'path';
import { test as base, type FullProject } from '@playwright/test';
import { WebDriverConfig } from '../types.ts';
import { DEFAULT_IMPLICIT_WAIT_MS } from '../Constants.ts';
import { createServiceProvider, type ServiceProvider } from '../services';
import {
  MetricsOutput,
  PerformanceTracker,
} from '../../reporters/PerformanceTracker';
import {
  getTestId,
  hasQualityGateFailure,
  markQualityGateFailure,
  QualityGatesValidator,
} from '../quality-gates';
import { getTeamInfoFromTags } from '../utils/teams';
import { publishPerformanceScenarioToSentry } from '../../reporters/providers/sentry/PerformanceSentryPublisher';

// ---------------------------------------------------------------------------
// File-based diagnostic logger
// Writes fixture lifecycle events to tests/test-reports/fixture-debug.log
// so they can be attached as CI artifacts and shared easily.
// ---------------------------------------------------------------------------
const LOG_FILE = path.resolve(
  __dirname,
  '../../test-reports/fixture-debug.log',
);

function fixtureLog(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
  const line = `${new Date().toISOString()} [${level}] ${message}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch {
    // Never let logging failures break test execution
  }
  if (level === 'ERROR') {
    console.error(message);
  } else if (level === 'WARN') {
    console.warn(message);
  } else {
    console.log(message);
  }
}

// Extend globalThis to include driver property
declare global {
  // eslint-disable-next-line no-var
  var driver: WebdriverIO.Browser | undefined;
}

export interface CurrentDeviceDetails {
  platform: 'android' | 'ios';
  deviceName: string;
  packageName?: string;
  appId?: string;
  launchableActivity?: string;
}

interface TestLevelFixtures {
  /**
   * Platform detector to be used for the test.
   * This detects the platform of the device being tested.
   */
  currentDeviceDetails: CurrentDeviceDetails;

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
   * This collects and attaches performance metrics to the test.
   * It also handles quality gate validation and Sentry publishing.
   */
  performanceTracker: PerformanceTracker;
}

function getSessionIdFromAnnotations(
  annotations?: { type: string; description?: string }[],
): string | null {
  return annotations?.find((a) => a.type === 'sessionId')?.description ?? null;
}

/**
 * Polls POST /session/:id/timeouts (the implicit wait setter) until it
 * succeeds, confirming the Appium driver is fully ready to accept commands.
 *
 * Why this is needed:
 * BrowserStack returns HTTP 200 for POST /session before XCUITest/UiAutomator2
 * has fully bootstrapped on the device (observed when WDA is not cached and
 * startup takes 15-30s). During that window, POST /session/:id/timeouts is
 * rejected immediately with a Timeout error while other endpoints (e.g.
 * GET /window/rect) may already succeed — they go through different code paths
 * on BrowserStack's Appium hub.
 *
 * When WDA IS cached, remote() blocks for the full session creation and
 * the first poll here succeeds immediately. This function is a no-cost
 * safety net for the cold-start case.
 *
 * @param driver - The WebdriverIO browser instance
 * @param implicitMs - The implicit wait value to set (used as both probe and final value)
 * @param options.pollIntervalMs - How long to wait between attempts (default 500ms)
 * @param options.timeoutMs - Maximum time to wait before giving up (default 240s, intentionally below idleTimeout:300 in BrowserStackConfigBuilder)
 */
async function waitForSetTimeoutReady(
  driver: WebdriverIO.Browser,
  implicitMs: number,
  options: { pollIntervalMs?: number; timeoutMs?: number } = {},
): Promise<void> {
  const { pollIntervalMs = 500, timeoutMs = 240_000 } = options;
  const deadline = Date.now() + timeoutMs;
  const start = Date.now();
  let attempts = 0;
  let lastError: unknown;

  while (Date.now() < deadline) {
    attempts++;
    try {
      await driver.setTimeout({ implicit: implicitMs });
      if (attempts > 1) {
        fixtureLog(
          'INFO',
          `[fixture] waitForSetTimeoutReady: succeeded on attempt ${attempts} after ${Date.now() - start}ms`,
        );
      }
      return;
    } catch (err) {
      lastError = err;
      const elapsed = Date.now() - start;
      const message = err instanceof Error ? err.message : String(err);
      fixtureLog(
        'WARN',
        `[fixture] waitForSetTimeoutReady: attempt ${attempts} failed at ${elapsed}ms — ${message}`,
      );
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `BrowserStack Appium driver did not accept setTimeout within ${timeoutMs}ms ` +
      `(${attempts} attempts). Last error: ${message}. ` +
      `The device driver (UiAutomator2/XCUITest) may still be bootstrapping.`,
  );
}

export const test = base.extend<TestLevelFixtures>({
  // eslint-disable-next-line no-empty-pattern
  currentDeviceDetails: async ({}, use, testInfo) => {
    const project = testInfo.project as FullProject<WebDriverConfig>;
    const platform = project.use.platform;
    const deviceName = project.use.device?.name;
    const packageName = project.use.app?.packageName;
    const appId = project.use.app?.appId;
    const launchableActivity = project.use.app?.launchableActivity;

    const missingFields = [
      ...(!platform ? ['"use.platform"'] : []),
      ...(!deviceName ? ['"use.device.name"'] : []),
    ];

    if (missingFields.length > 0) {
      throw new Error(
        `Missing ${missingFields.join(' and ')} for project "${project.name}" in tests/playwright.config.ts.`,
      );
    }

    const deviceDetails: CurrentDeviceDetails = {
      platform: platform as 'android' | 'ios',
      deviceName: deviceName as string,
      packageName,
      appId,
      launchableActivity,
    };

    await use(deviceDetails);
  },

  // eslint-disable-next-line no-empty-pattern
  deviceProvider: async ({}, use, testInfo) => {
    const deviceProvider = createServiceProvider(testInfo.project);
    await use(deviceProvider);
  },

  driver: async ({ deviceProvider }, use, testInfo) => {
    let driver: WebdriverIO.Browser | undefined;
    const project = testInfo.project as FullProject<WebDriverConfig>;

    try {
      // Create driver and set up test context
      fixtureLog(
        'INFO',
        `[fixture] driver: calling getDriver() for "${testInfo.title}"`,
      );
      driver = await deviceProvider.getDriver();
      fixtureLog(
        'INFO',
        `[fixture] driver: getDriver() returned, sessionId=${deviceProvider.sessionId}`,
      );

      // Set the implicit timeout for the driver.
      // On BrowserStack, POST /session/:id/timeouts is polled until it succeeds
      // because the Appium driver (UiAutomator2/XCUITest) continues bootstrapping
      // after remote() returns and rejects commands during that window.
      // On emulators the call is made directly — no polling needed.
      const implicitMs = project.use.expectTimeout ?? DEFAULT_IMPLICIT_WAIT_MS;
      const isBrowserStack = project.use.device?.provider === 'browserstack';
      if (isBrowserStack) {
        fixtureLog(
          'INFO',
          `[fixture] driver: starting waitForSetTimeoutReady (implicitMs=${implicitMs})`,
        );
        await waitForSetTimeoutReady(driver, implicitMs);
        fixtureLog(
          'INFO',
          '[fixture] driver: waitForSetTimeoutReady completed',
        );
      } else {
        await driver.setTimeout({ implicit: implicitMs });
      }

      // Make driver globally accessible for utilities
      globalThis.driver = driver;

      // Add test metadata as annotations
      const deviceProviderName = project.use.device?.provider;

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
        console.error('Failed to sync pre-test details:', error);
      }

      fixtureLog('INFO', '[fixture] driver: handing driver to test body');

      // Run the test
      await use(driver);
    } finally {
      // Cleanup happens even if test fails
      const testStatus = testInfo.status;
      const testError = testInfo.error?.message;
      fixtureLog(
        testStatus === 'passed' ? 'INFO' : 'WARN',
        `[fixture] driver: test finished — status=${testStatus}${testError ? ` error="${testError}"` : ''}`,
      );

      try {
        // Sync final test status to provider (e.g., BrowserStack dashboard)
        // This must happen BEFORE session deletion to ensure reliable status reporting
        await deviceProvider.syncTestDetails?.({
          name: testInfo.title,
          status: testStatus,
          reason: testError,
        });
      } catch (error) {
        console.error('Failed to sync test details:', error);
      }

      try {
        // Upload fixture-debug.log to BrowserStack's "Other Logs" tab so it's
        // visible on the session dashboard alongside Appium/device logs.
        const sessionId = deviceProvider.sessionId;
        if (sessionId) {
          await deviceProvider.uploadTerminalLogs?.(sessionId, LOG_FILE);
        }
      } catch (error) {
        console.error('Failed to upload terminal logs:', error);
      }

      try {
        // Close WebDriver session
        if (driver) {
          await driver.deleteSession();
        }
      } catch (error) {
        console.error('Failed to delete WebDriver session:', error);
      }

      try {
        // Clean up global driver reference
        delete globalThis.driver;
      } catch (error) {
        console.error('Failed to clean up global driver:', error);
      }

      try {
        // Provider-specific cleanup (e.g., stop Appium server for emulator)
        await deviceProvider.cleanup?.();
      } catch (error) {
        console.error('Provider cleanup failed:', error);
      }
    }
  },

  performanceTracker: async ({ deviceProvider }, use, testInfo) => {
    const testId = getTestId(testInfo);

    // Skip retry if previous attempt failed due to quality gates
    // Quality gate failures should NOT be retried - the measurement was valid, only threshold exceeded
    if (testInfo.retry > 0 && hasQualityGateFailure(testId)) {
      console.log(
        `⏭️ Skipping retry for "${testInfo.title}" - previous attempt failed due to Quality Gates (threshold exceeded, not a test execution error)`,
      );
      testInfo.skip(
        true,
        'Skipped retry: Quality Gates failed in previous attempt. Performance threshold was exceeded but test execution was successful.',
      );
      return;
    }

    const performanceTracker = new PerformanceTracker();

    // Get team info from test tags (e.g., { tag: '@swap-bridge-dev-team' })
    const testTags = testInfo.tags || [];
    const teamInfo = getTeamInfoFromTags(testTags);
    performanceTracker.setTeamInfo(teamInfo);

    console.log(
      `👥 Test assigned to team: ${teamInfo.teamName} (${teamInfo.teamId})`,
    );

    // Provide the tracker to the test
    await use(performanceTracker);

    // After test completes, handle performance metrics and session cleanup
    console.log('🔍 Post-test cleanup: attaching performance metrics...');
    console.log(
      `📊 Found ${performanceTracker.timers.length} timers in tracker`,
    );

    if (performanceTracker.timers.length === 0) {
      console.log('⚠️ No timers found in performance tracker');
    }

    // Always try to attach performance metrics, even if test failed
    let metrics: MetricsOutput | null = null;
    try {
      metrics = await performanceTracker.attachToTest(testInfo);
      console.log(
        `✅ Performance metrics attached: ${
          metrics.steps.length
        } steps, ${metrics.total.toFixed(2)}s total`,
      );
    } catch (error) {
      console.error(
        '❌ Failed to attach performance metrics:',
        (error as Error).message,
      );
    }

    const sessionId = getSessionIdFromAnnotations(testInfo.annotations);

    if (metrics) {
      const videoRecordingUrl =
        (await deviceProvider.getRecordingUrl?.(sessionId ?? '')) ?? null;

      try {
        const sentToSentry = await publishPerformanceScenarioToSentry({
          metrics,
          testTitle: testInfo.title,
          projectName: testInfo.project?.name ?? 'unknown',
          testFilePath: testInfo.file,
          videoRecordingUrl,
          tags: testTags,
          status: testInfo.status,
          retry: testInfo.retry,
          workerIndex: testInfo.workerIndex,
        });

        if (sentToSentry) {
          console.log(`📡 Scenario "${testInfo.title}" sent to Sentry`);
        }
      } catch (error) {
        console.error(
          `❌ Failed to publish scenario "${testInfo.title}" to Sentry:`,
          (error as Error).message,
        );
      }
    }

    // Validate quality gates if any timer has thresholds defined
    const hasThresholds = performanceTracker.timers.some((t) =>
      t.hasThreshold(),
    );
    if (hasThresholds) {
      console.log('🔍 Validating quality gates...');
      try {
        QualityGatesValidator.assertThresholds(
          testInfo.title,
          performanceTracker.timers,
        );
        console.log('✅ Quality gates PASSED');
      } catch (error) {
        // Mark this test as failed due to quality gates so retries are skipped
        if (
          (error as Error & { isQualityGateError?: boolean }).isQualityGateError
        ) {
          markQualityGateFailure(testId);
          console.log(
            '🚫 Quality gates FAILED - retries will be skipped for this test',
          );
        }
        throw error;
      }
    }

    console.log('🔍 Looking for session ID...');

    if (sessionId) {
      // Store session data as a test attachment for the reporter to find
      // Include team info and tags in session data
      await testInfo.attach('session-data', {
        body: JSON.stringify({
          sessionId,
          testTitle: testInfo.title,
          testFilePath: testInfo.file || '',
          tags: testTags,
          projectName: testInfo.project.name,
          timestamp: new Date().toISOString(),
          team: teamInfo,
        }),
        contentType: 'application/json',
      });

      console.log(`✅ Session data stored: ${sessionId}`);
    } else {
      console.log('⚠️ No session ID found - video URL cannot be retrieved');
    }
  },
});
