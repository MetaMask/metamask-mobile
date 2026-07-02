import '../../nodeNativeUtilsShim.cjs';
import { test as base } from '@playwright/test';
import type { TestLevelFixtures } from './types.ts';
import { currentDeviceDetailsFixture } from './currentDeviceDetails.fixture.ts';
import { deviceProviderFixture } from './deviceProvider.fixture.ts';
import { driverFixture } from './driver.fixture.ts';
import { performanceTrackerFixture } from './performanceTracker.fixture.ts';

export type { CurrentDeviceDetails, TestLevelFixtures } from './types.ts';

declare global {
  // eslint-disable-next-line no-var
  var driver: WebdriverIO.Browser | undefined;
}

export const test = base.extend<TestLevelFixtures>({
  ...currentDeviceDetailsFixture,
  ...deviceProviderFixture,
  ...driverFixture,
  ...performanceTrackerFixture,
});
