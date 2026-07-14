import type { TestInfo } from '@playwright/test';
import {
  MetricsOutput,
  PerformanceTracker,
} from '../../../reporters/PerformanceTracker';
import {
  getTestId,
  hasQualityGateFailure,
  markQualityGateFailure,
  QualityGatesValidator,
  QualityGateError,
} from '../../quality-gates';
import { getTeamInfoFromTags } from '../../utils/teams';
import { publishPerformanceScenarioToSentry } from '../../../reporters/providers/sentry/PerformanceSentryPublisher';
import type { TestLevelFixtures } from './types.ts';
import { createPlaywrightLogger } from '../../playwrightLogger.ts';

const logger = createPlaywrightLogger('performanceTracker');

function getSessionIdFromAnnotations(
  annotations?: { type: string; description?: string }[],
): string | null {
  return annotations?.find((a) => a.type === 'sessionId')?.description ?? null;
}

export const performanceTrackerFixture = {
  performanceTracker: async (
    { deviceProvider }: Pick<TestLevelFixtures, 'deviceProvider'>,
    use: (performanceTracker: PerformanceTracker) => Promise<void>,
    testInfo: TestInfo,
  ) => {
    const isSystemTestMode = process.env.SYSTEM_TEST_MODE === 'true';
    const testId = getTestId(testInfo);

    // Abort retry if previous attempt failed due to quality gates.
    // Quality gate failures should NOT be retried - the measurement was valid,
    // only the threshold was exceeded. We throw (not skip) so Playwright counts
    // all attempts as failed and reports the test as "failed" rather than "flaky".
    if (
      !isSystemTestMode &&
      testInfo.retry > 0 &&
      hasQualityGateFailure(testId)
    ) {
      throw new QualityGateError(
        `Quality Gates failed on a previous attempt for "${testInfo.title}". Retries are not allowed for quality gate failures.`,
      );
    }

    const performanceTracker = new PerformanceTracker();

    const testTags = testInfo.tags || [];
    const teamInfo = getTeamInfoFromTags(testTags);
    performanceTracker.setTeamInfo(teamInfo);

    logger.info(
      `Test assigned to team: ${teamInfo.teamName} (${teamInfo.teamId})`,
    );

    await use(performanceTracker);

    if (isSystemTestMode) {
      return;
    }

    logger.info('Post-test cleanup: attaching performance metrics');
    logger.debug(
      `Found ${performanceTracker.timers.length} timers in performance tracker`,
    );

    if (performanceTracker.timers.length === 0) {
      logger.warn('No timers found in performance tracker');
    }

    // Propagate BrowserStack session creation time (infra overhead, not counted in total)
    if (deviceProvider.sessionCreationDurationMs !== undefined) {
      performanceTracker.setSessionCreationDuration(
        deviceProvider.sessionCreationDurationMs,
      );
    }

    let metrics: MetricsOutput | null = null;
    try {
      metrics = await performanceTracker.attachToTest(testInfo);
      logger.info(
        `Performance metrics attached: ${
          metrics.steps.length
        } steps, ${metrics.total.toFixed(2)}s total`,
      );
    } catch (error) {
      logger.error('Failed to attach performance metrics:', error);
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
          logger.info(`Scenario "${testInfo.title}" sent to Sentry`);
        }
      } catch (error) {
        logger.error(
          `Failed to publish scenario "${testInfo.title}" to Sentry:`,
          error,
        );
      }
    }

    const hasThresholds = performanceTracker.timers.some((t) =>
      t.hasThreshold(),
    );
    if (hasThresholds) {
      logger.info('Validating quality gates');
      try {
        QualityGatesValidator.assertThresholds(
          testInfo.title,
          performanceTracker.timers,
        );
        logger.info('Quality gates passed');
      } catch (error) {
        if (
          (error as Error & { isQualityGateError?: boolean }).isQualityGateError
        ) {
          markQualityGateFailure(testId);
          logger.warn(
            'Quality gates failed - retries will be skipped for this test',
          );
        }
        throw error;
      }
    }

    logger.debug('Looking for session ID');

    if (sessionId) {
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

      logger.info(`Session data stored: ${sessionId}`);
    } else {
      logger.warn('No session ID found - video URL cannot be retrieved');
    }
  },
};
