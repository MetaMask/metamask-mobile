import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import { DateTime } from 'luxon';
import Assertions from '../../framework/Assertions.js';
import Matchers from '../../framework/Matchers.js';
import Utilities from '../../framework/Utilities.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe.skip(SmokeSnaps('Interactive UI Snap Tests'), () => {
  // Skipped: Appium needs platform-specific Snap UI locators (textfield,
  // dropdown vs selector sheets, DateTimeModal date/time pickers). Revisit later.
  appiumTest.describe.configure({ mode: 'serial', timeout: 150_000 });

  appiumTest(
    'can connect to the Interactive UI Snap',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: true },
        async () => {
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectInteractiveButton');
        },
      );
    },
  );

  appiumTest(
    'renders an interactive UI',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: false },
        async () => {
          await TestSnaps.tapButton('createDialogButton');

          const dateTimePickerDate = DateTime.now();

          await TestSnaps.fillInput('example-input', 'foo bar');
          await TestSnaps.selectInNativeDropdown('snapUIDropdown', 'Option 2');
          await TestSnaps.selectRadioButton('Option 1');
          await TestSnaps.tapCheckbox();
          await TestSnaps.selectInNativeDropdown('snapUISelector', 'Option 3');
          await TestSnaps.selectDateInDateTimePicker();
          await TestSnaps.selectDateInDatePicker();
          await TestSnaps.selectTimeInTimePicker();
          await TestSnaps.tapSubmitButton();

          await Assertions.expectTextDisplayed('foo bar');
          await Assertions.expectTextDisplayed('option2');
          await Assertions.expectTextDisplayed('option1');
          await Assertions.expectTextDisplayed('true');
          await Assertions.expectTextDisplayed('option3');
          await Assertions.expectTextDisplayed(
            dateTimePickerDate.set({ second: 0, millisecond: 0 }).toISO(),
          );
          await Assertions.expectTextDisplayed(
            dateTimePickerDate
              .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
              .toISO(),
          );
          await Assertions.expectTextDisplayed(
            dateTimePickerDate.set({ second: 0, millisecond: 0 }).toISO(),
          );

          await TestSnaps.tapOkButton();
        },
      );
    },
  );

  appiumTest(
    'renders a disabled UI',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: false },
        async () => {
          await TestSnaps.tapButton('createDialogDisabledButton');

          const input = Matchers.getElementByID('example-input-snap-ui-input');
          await Assertions.expectElementToBeVisible(input);

          await Utilities.waitForElementToBeDisabled(input);
          await Utilities.waitForElementToBeDisabled(
            Matchers.getElementByID('snap-ui-renderer__dropdown'),
          );
          await Utilities.waitForElementToBeDisabled(
            Matchers.getElementByID('snap-ui-renderer__radio'),
          );
          await Utilities.waitForElementToBeDisabled(
            Matchers.getElementByID('snap-ui-renderer__checkbox'),
          );
          await Utilities.waitForElementToBeDisabled(
            Matchers.getElementByID('snap-ui-renderer__selector'),
          );

          await Utilities.waitForElementToBeDisabled(
            TestSnaps.dateTimePickerTouchable,
          );
          await Utilities.waitForElementToBeDisabled(
            TestSnaps.datePickerTouchable,
          );
          await Utilities.waitForElementToBeDisabled(
            TestSnaps.timePickerTouchable,
          );

          await Utilities.waitForElementToBeDisabled(
            Matchers.getElementByText('Submit'),
          );

          await TestSnaps.tapCancelButton();
        },
      );
    },
  );
});
