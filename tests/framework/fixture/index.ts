import { test as base, type FullProject } from '@playwright/test';
import { SrpProfile, WebDriverConfig } from '../types.ts';
import {
  DEFAULT_IMPLICIT_WAIT_MS,
  FALLBACK_COMMAND_QUEUE_SERVER_PORT,
} from '../Constants.ts';
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
import CommandQueueServer from '../fixtures/CommandQueueServer.ts';
import { PlatformDetector } from '../PlatformLocator.ts';

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
   * The type of SRP profile to import during initialization.
   * This is set by the CommandQueueServer.
   */
  srpProfile: SrpProfile;

  /**
   * Command queue server to be used for the test.
   * This is used to pre-load SRPs into the app during initialization.
   * The app fetches this value from the command queue server at startup.
   * Override per-test via test.use({ commandQueueServer: CommandQueueServer }) or default to a new instance.
   */
  commandQueueServer: CommandQueueServer;

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

  /**
   * Number of SRPs to pre-load in the app during initialization.
   * The app fetches this from the command queue server at startup.
   * Override per-test via test.use({ srpProfile: SrpProfile.PERFORMANCE }) or default to SrpProfile.PERFORMANCE.
   */
  srpProfile: [SrpProfile.PERFORMANCE, { option: true }],

  commandQueueServer: async (
    { srpProfile, currentDeviceDetails },
    use,
    testInfo,
  ) => {
    // Set platform from appwright project config so PlatformDetector works
    // without Detox/Appium globals or env vars
    const platform = currentDeviceDetails.platform;
    if (platform === 'android' || platform === 'ios') {
      PlatformDetector.setPlatform(platform);
    }
    const server = new CommandQueueServer();
    server.setServerPort(FALLBACK_COMMAND_QUEUE_SERVER_PORT);
    await server.start();
    server.setSrpProfile(srpProfile);

    console.log(
      `[Performance] Command queue server started on port ${server.getServerPort()} with srpProfile=${srpProfile.toString()}`,
    );
    await use(server);
    await server.stop();
    console.log('[Performance] Command queue server stopped');
  },

  // eslint-disable-next-line no-empty-pattern
  deviceProvider: async ({ commandQueueServer }, use, testInfo) => {
    const deviceProvider = createServiceProvider(testInfo.project);
    await use(deviceProvider);
  },

  driver: async ({ deviceProvider }, use, testInfo) => {
    let driver: WebdriverIO.Browser | undefined;
    const project = testInfo.project as FullProject<WebDriverConfig>;

    try {
      // Create driver and set up test context
      driver = await deviceProvider.getDriver();

      // Set the implicit timeout for the driver.
      // Wrapped in retry because BrowserStack sessions can transiently reject
      // the setTimeout command before the session is fully initialised.
      const implicitMs = project.use.expectTimeout ?? DEFAULT_IMPLICIT_WAIT_MS;
      const maxRetries = 5;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await driver.setTimeout({ implicit: implicitMs });
          break;
        } catch (err) {
          if (attempt === maxRetries) throw err;
          const backoff = Math.min(2 ** attempt * 1000, 15000);
          console.warn(
            `driver.setTimeout failed (attempt ${attempt}/${maxRetries}), retrying in ${backoff}ms…`,
          );
          await new Promise((r) => setTimeout(r, backoff));
        }
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

      // Run the test
      await use(driver);
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
        console.error('Failed to sync test details:', error);
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
