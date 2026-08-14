import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Dialog Snap Tests'), () => {
  appiumTest.describe.configure({ mode: 'serial', timeout: 150_000 });

  appiumTest(
    'connects to the Dialog Snap',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: true },
        async () => {
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectDialogSnapButton');
        },
      );
    },
  );

  appiumTest.describe('alert', () => {
    appiumTest(
      'shows an alert dialog',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withSnapsFixtures(
          currentDeviceDetails,
          { restartDevice: false },
          async () => {
            await TestSnaps.tapButton('sendAlertButton');
            await Assertions.expectTextDisplayed(
              'This is an alert dialog. It has a single button: "OK".',
            );
            await TestSnaps.tapOkButton();
            await TestSnaps.checkResultSpan('dialogResultSpan', 'null');
          },
        );
      },
    );
  });

  appiumTest.describe('confirmation', () => {
    appiumTest(
      'shows a confirmation dialog',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withSnapsFixtures(
          currentDeviceDetails,
          { restartDevice: false },
          async () => {
            await TestSnaps.tapButton('sendConfirmationButton');
            await Assertions.expectTextDisplayed('Confirmation Dialog');
            await TestSnaps.tapApproveButton();
            await TestSnaps.checkResultSpan('dialogResultSpan', 'true');
          },
        );
      },
    );

    appiumTest(
      'shows a confirmation dialog and cancels',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withSnapsFixtures(
          currentDeviceDetails,
          { restartDevice: false },
          async () => {
            await TestSnaps.tapButton('sendConfirmationButton');
            await Assertions.expectTextDisplayed('Confirmation Dialog');
            await TestSnaps.tapCancelButton();
            await TestSnaps.checkResultSpan('dialogResultSpan', 'false');
          },
        );
      },
    );
  });

  appiumTest.describe('custom', () => {
    appiumTest(
      'shows a custom dialog',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withSnapsFixtures(
          currentDeviceDetails,
          { restartDevice: false },
          async () => {
            await TestSnaps.tapButton('sendCustomButton');
            await Assertions.expectTextDisplayed('Custom Dialog');
            await TestSnaps.fillCustomDialogInput('Hello, World!');
            await TestSnaps.tapConfirmButton();
            await TestSnaps.checkResultSpan(
              'dialogResultSpan',
              '"Hello, World!"',
            );
          },
        );
      },
    );
  });
});
