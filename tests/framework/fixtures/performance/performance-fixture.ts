import { test as base } from 'appwright';
import {
  PerformanceTracker,
  type MetricsOutput,
} from '../../../reporters/PerformanceTracker';
import { publishPerformanceScenarioToSentry } from '../../../reporters/providers/sentry/PerformanceSentryPublisher';
import { BrowserStackAPI } from '../../services/providers/browserstack/BrowserStackAPI';
import {
  QualityGatesValidator,
  markQualityGateFailure,
  hasQualityGateFailure,
  getTestId,
} from '../../quality-gates';
import { getTeamInfoFromTags } from '../../utils/teams';
import { IsDisplayedParams, PlaywrightElement } from '../../PlaywrightAdapter';

interface PerformanceFixtures {
  performanceTracker: PerformanceTracker;
}

/**
 * @deprecated Use PlaywrightHelpers.getBrowserStackRecordingUrl() instead
 * @param sessionId - The session ID
 * @param projectName - The project name
 * @returns The browser stack recording URL
 */
async function getBrowserStackRecordingUrl(
  sessionId: string | null,
  projectName: string,
): Promise<string | null> {
  if (!sessionId || !projectName.toLowerCase().includes('browserstack')) {
    return null;
  }

  try {
    const api = new BrowserStackAPI();
    const sessionDetails = await api.getSessionDetails(sessionId);
    if (!sessionDetails?.buildId) {
      return null;
    }

    return api.buildSessionURL(sessionDetails.buildId, sessionId);
  } catch {
    return null;
  }
}

/**
 * @deprecated Use PlaywrightHelpers.getSessionIdFromAnnotations() instead
 * @param annotations - The annotations
 * @returns The session ID
 */
function getSessionIdFromAnnotations(
  annotations?: { type: string; description?: string }[],
): string | null {
  return (
    annotations?.find((annotation) => annotation.type === 'sessionId')
      ?.description ?? null
  );
}

/**
 * @deprecated Use PlaywrightHelpers.test() instead
 * @param performanceTracker - The performance tracker
 */
export const test = base.extend<PerformanceFixtures>({
  // eslint-disable-next-line no-empty-pattern
  performanceTracker: async ({}, use, testInfo) => {
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
      const videoRecordingUrl = await getBrowserStackRecordingUrl(
        sessionId,
        testInfo.project?.name ?? 'unknown',
      );

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

/**
 * @deprecated Use PlaywrightHelpers.expect() instead
 * Extend the test expect with a toBeVisible matcher.
 * @param locator - The locator to check.
 * @param options - The options to pass to the isVisible method.
 * @returns The result of the isVisible method.
 */
export const expect = test.expect.extend({
  toBeVisible: async (elem: PlaywrightElement, options?: IsDisplayedParams) => {
    const isVisible = await elem.isVisible(options);
    return {
      message: () =>
        isVisible
          ? `Expected element NOT to be visible, but it was found on the screen`
          : `Element was not found on the screen`,
      pass: isVisible,
      name: 'toBeVisible',
      expected: true,
      actual: isVisible,
    };
  },
});
