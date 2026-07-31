import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import Gestures from '../../framework/Gestures.js';
import Matchers from '../../framework/Matchers.js';
import UnifiedGestures from '../../framework/UnifiedGestures.js';
import { resolve } from '../../framework/index.js';
import { PlatformDetector } from '../../framework/PlatformLocator.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

// iOS Appium: count StaticTexts are not accessible; use SnapUI card parent label instead
function jsxCountElement(count: string) {
  if (PlatformDetector.isIOSAppium()) {
    return resolve({
      detoxTestID: '',
      androidAppiumTestID: '',
      iosAppiumXPath: `//*[@name="snap-ui-renderer__scrollview"]//*[@accessible="true" and contains(@label,"Count, ${count}")]`,
    });
  }
  return Matchers.getElementByText(count);
}

async function tapIncrementButton(): Promise<void> {
  if (PlatformDetector.isIOSAppium()) {
    await UnifiedGestures.waitAndTap(
      resolve({
        detoxTestID: '',
        androidAppiumTestID: '',
        iosAppiumXPath:
          '//*[@name="snap-ui-renderer__scrollview"]//*[@name="Increment"]',
      }),
      { checkForDisplayed: false },
    );
    return;
  }

  await Gestures.tap(Matchers.getElementByText('Increment'));
}

appiumTest.describe(SmokeSnaps('JSX Snap Tests'), () => {
  appiumTest.describe.configure({ mode: 'serial', timeout: 150_000 });

  appiumTest(
    'can connect to the JSX Snap',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: true },
        async () => {
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectJsx');
        },
      );
    },
  );

  appiumTest(
    'displays a modifiable JSX interface',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: false },
        async () => {
          await TestSnaps.tapButton('displayJsxButton');
          await Assertions.expectElementToBeVisible(jsxCountElement('0'));
          await tapIncrementButton();
          await Assertions.expectElementToBeVisible(jsxCountElement('1'));
        },
      );
    },
  );
});
