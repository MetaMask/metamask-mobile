import '../../nodeNativeUtilsShim.cjs';
import { test as base } from '@playwright/test';
import type { TestLevelFixtures, WorkerLevelFixtures } from './types.ts';
import { currentDeviceDetailsFixture } from './currentDeviceDetails.fixture.ts';
import { workerDeviceProviderFixture } from './deviceProvider.fixture.ts';
import { driverFixture } from './driver.fixture.ts';
import { performanceTrackerFixture } from './performanceTracker.fixture.ts';
import { phaseTimerFixture } from './phaseTimer.fixture.ts';

export type {
  CurrentDeviceDetails,
  SharedAppiumSession,
  TestLevelFixtures,
  WorkerLevelFixtures,
} from './types.ts';

declare global {
  // eslint-disable-next-line no-var
  var driver: WebdriverIO.Browser | undefined;
}

export const test = base.extend<TestLevelFixtures, WorkerLevelFixtures>({
  ...workerDeviceProviderFixture,
  ...currentDeviceDetailsFixture,
  ...driverFixture,
  ...performanceTrackerFixture,
  ...phaseTimerFixture,
});
