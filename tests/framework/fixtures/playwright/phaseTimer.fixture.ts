import type { Fixtures, FullProject, TestInfo } from '@playwright/test';
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
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return undefined;
}

/**
 * Auto phase-timer fixture: binds ALS for FixtureHelper/login and attaches JSON.
 * Depends on `driver` so session annotations exist before attach.
 */
export const phaseTimerFixture: Fixtures<
  TestLevelFixtures,
  WorkerLevelFixtures
> = {
  phaseTimer: [
    async ({ driver: _driver, deviceProvider }, use, testInfo: TestInfo) => {
      const timer = createPhaseTimer();
      const project = testInfo.project as FullProject<WebDriverConfig>;
      const suiteName = process.env.APPIUM_SMOKE_SUITE_NAME?.trim();

      timer.setMeta({
        platform: project.use.platform,
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
          timer.setMeta({
            outcome: testInfo.status,
            sessionReused: parseBooleanAnnotation(
              annotationDescription(testInfo.annotations, 'sessionReused'),
            ),
            sessionRecreated: parseBooleanAnnotation(
              annotationDescription(testInfo.annotations, 'sessionRecreated'),
            ),
            sessionCreationMs: deviceProvider.sessionCreationDurationMs,
          });

          try {
            await testInfo.attach(PHASE_TIMINGS_ATTACHMENT_NAME, {
              body: JSON.stringify(timer.snapshot()),
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
