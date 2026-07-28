import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import Gestures from '../../framework/Gestures.js';
import Matchers from '../../framework/Matchers.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Dialog Snap Tests'), () => {
  appiumTest(
    'connects to the Dialog Snap and shows alert, confirmation, and custom dialogs',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(currentDeviceDetails, {}, async () => {
        await loginAndOpenTestSnaps();
        await TestSnaps.installSnap('connectDialogSnapButton');

        await TestSnaps.tapButton('sendAlertButton');
        await Assertions.expectTextDisplayed(
          'This is an alert dialog. It has a single button: "OK".',
        );
        await TestSnaps.tapOkButton();
        await TestSnaps.checkResultSpan('dialogResultSpan', 'null');

        await TestSnaps.tapButton('sendConfirmationButton');
        await Assertions.expectTextDisplayed('Confirmation Dialog');
        await TestSnaps.tapApproveButton();
        await TestSnaps.checkResultSpan('dialogResultSpan', 'true');

        await TestSnaps.tapButton('sendConfirmationButton');
        await Assertions.expectTextDisplayed('Confirmation Dialog');
        await TestSnaps.tapCancelButton();
        await TestSnaps.checkResultSpan('dialogResultSpan', 'false');

        await TestSnaps.tapButton('sendCustomButton');
        await Assertions.expectTextDisplayed('Custom Dialog');
        const input = Matchers.getElementByID('custom-input-snap-ui-input');
        await Gestures.typeText(input, 'Hello, World!', { hideKeyboard: true });
        await TestSnaps.tapConfirmButton();
        await TestSnaps.checkResultSpan('dialogResultSpan', '"Hello, World!"');
      });
    },
  );
});
