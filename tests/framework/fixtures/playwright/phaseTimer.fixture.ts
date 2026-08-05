import type { FullProject, TestInfo } from '@playwright/test';
import type { WebDriverConfig } from '../../types.ts';
import {
  createPhaseTimer,
  PHASE_TIMINGS_ATTACHMENT_NAME,
  runWithPhaseTimer,
  type PhaseTimer,
} from '../../telemetry/PhaseTimer.ts';
import { createPlaywrightLogger } from '../../playwrightLogger.ts';
import type { TestLevelFixtures, WorkerLevelFixtures } from './types.ts';

const logger = createPlaywrightLogger('phaseTimer');

function annotationDescription(
  annotations: { type: string; description?: string }[] | undefined,
  type: string,
): string | undefined {
  return annotations?.find((a) => a.type === type)?.description;
}

function parseBooleanAnnotation(
  value: string | undefined,
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return undefined;
}

/**
 * Test-scoped Appium phase timer.
 *
 * Auto-fixture: runs for every smoke test. Depends on `driver` so session
 * annotations exist before attach. Binds AsyncLocalStorage so FixtureHelper /
 * login helpers can call getPhaseTimer().
 */
export const phaseTimerFixture = {
  phaseTimer: [
    async (
      {
        driver: _driver,
        deviceProvider,
      }: Pick<TestLevelFixtures, 'driver'> &
        Pick<WorkerLevelFixtures, 'deviceProvider'>,
      use: (timer: PhaseTimer) => Promise<void>,
      testInfo: TestInfo,
    ) => {
      const timer = createPhaseTimer();
      const project = testInfo.project as FullProject<WebDriverConfig>;
      const platform = project.use.platform;
      const suiteName = process.env.APPIUM_SMOKE_SUITE_NAME?.trim();

      timer.setMeta({
        platform,
        suite: suiteName || 'local',
        spec: testInfo.file,
        title: testInfo.title,
        retry: testInfo.retry,
        sessionCreationMs: deviceProvider.sessionCreationDurationMs,
      });

      await runWithPhaseTimer(timer, async () => {
        try {
          await use(timer);
        } finally {
          const sessionReused = parseBooleanAnnotation(
            annotationDescription(testInfo.annotations, 'sessionReused'),
          );
          const sessionRecreated = parseBooleanAnnotation(
            annotationDescription(testInfo.annotations, 'sessionRecreated'),
          );

          timer.setMeta({
            outcome: testInfo.status,
            sessionReused,
            sessionRecreated,
            sessionCreationMs: deviceProvider.sessionCreationDurationMs,
          });

          const snapshot = timer.snapshot();
          try {
            await testInfo.attach(PHASE_TIMINGS_ATTACHMENT_NAME, {
              body: JSON.stringify(snapshot),
              contentType: 'application/json',
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            logger.error(`Failed to attach phase timings: ${message}`);
          }
        }
      });
    },
    { auto: true },
  ],
};
