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
} from '../../quality-gates';
import { getTeamInfoFromTags } from '../../utils/teams';
import { publishPerformanceScenarioToSentry } from '../../../reporters/providers/sentry/PerformanceSentryPublisher';
import { getSessionIdFromAnnotations } from './utils/sessionAnnotations.ts';
import type { TestLevelFixtures } from './types.ts';

export const performanceTrackerFixture = {
  performanceTracker: async (
    { deviceProvider }: Pick<TestLevelFixtures, 'deviceProvider'>,
    use: (performanceTracker: PerformanceTracker) => Promise<void>,
    testInfo: TestInfo,
  ) => {
    const isSystemTestMode = process.env.SYSTEM_TEST_MODE === 'true';
    const testId = getTestId(testInfo);

    if (
      !isSystemTestMode &&
      testInfo.retry > 0 &&
      hasQualityGateFailure(testId)
    ) {
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

    const testTags = testInfo.tags || [];
    const teamInfo = getTeamInfoFromTags(testTags);
    performanceTracker.setTeamInfo(teamInfo);

    console.log(
      `👥 Test assigned to team: ${teamInfo.teamName} (${teamInfo.teamId})`,
    );

    await use(performanceTracker);

    if (isSystemTestMode) {
      return;
    }

    console.log('🔍 Post-test cleanup: attaching performance metrics...');
    console.log(
      `📊 Found ${performanceTracker.timers.length} timers in tracker`,
    );

    if (performanceTracker.timers.length === 0) {
      console.log('⚠️ No timers found in performance tracker');
    }

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
};
