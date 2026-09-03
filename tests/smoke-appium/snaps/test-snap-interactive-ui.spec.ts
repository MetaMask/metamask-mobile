import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import { DateTime } from 'luxon';
import Assertions from '../../framework/Assertions.js';
import Gestures from '../../framework/Gestures.js';
import Matchers from '../../framework/Matchers.js';
import Utilities from '../../framework/Utilities.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';
import {
  SNAP_UI_DATE_PICKER_INPUT_IDS,
  SnapUIRendererSelectorIDs,
} from '../../selectors/Browser/TestSnaps.selectors.js';
import { PlatformDetector } from '../../framework/PlatformLocator.js';

appiumTest.describe(SmokeSnaps('Interactive UI Snap Tests'), () => {
  // Serial: later cases reuse the Snap / session from the connect test.
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

          // Capture when pickers mount — SnapUIDateTimePicker seeds
          // internalValue with new Date() and submits that on OK if unchanged.
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

          const input = TestSnaps.getSnapUiInput('example-input');
          // iOS TextField wrapper stays enabled=true — skip input checks there.
          if (!PlatformDetector.isIOSAppium()) {
            await Assertions.expectElementToBeVisible(input);
            await Utilities.waitForElementToBeDisabled(input);
          }

          for (const testID of [
            SnapUIRendererSelectorIDs.dropdown,
            SnapUIRendererSelectorIDs.radioButton,
            SnapUIRendererSelectorIDs.checkbox,
            SnapUIRendererSelectorIDs.selector,
          ]) {
            await Utilities.waitForElementToBeDisabled(
              TestSnaps.getSnapUiNativeElement(testID),
            );
          }

          if (PlatformDetector.isAndroidAppium()) {
            // Off-screen virtualization + disabled touchables leave *-input nodes.
            await TestSnaps.revealSnapUiDatePickers();
            for (const inputId of SNAP_UI_DATE_PICKER_INPUT_IDS) {
              await Gestures.scrollToElement(
                Matchers.getElementByID(inputId),
                TestSnaps.snapUIRendererScrollView,
                { elemDescription: `${inputId} (disabled)` },
              );
              await Utilities.waitForElementToBeDisabled(
                Matchers.getElementByID(inputId),
              );
            }
          } else {
            for (const touchable of [
              TestSnaps.dateTimePickerTouchable,
              TestSnaps.datePickerTouchable,
              TestSnaps.timePickerTouchable,
            ]) {
              await Utilities.waitForElementToBeDisabled(touchable);
            }
          }

          await Utilities.waitForElementToBeDisabled(
            Matchers.getElementByText('Submit'),
          );

          await TestSnaps.tapCancelButton();
        },
      );
    },
  );
});
