import { FlaskBuildTests } from '../../tags';
import { loginToApp, navigateToBrowserView } from '../../viewHelper';
import TestSnaps from '../../pages/Browser/TestSnaps';
import Assertions from '../../../tests/framework/Assertions';
import Gestures from '../../../tests/framework/Gestures';
import { Matchers } from '../../../tests/framework';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Dialog Snap Tests'), () => {
  it('connects to the Dialog Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        skipReactNativeReload: true,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectDialogSnapButton');
      },
    );
  });

  describe('alert', () => {
    it('shows an alert dialog', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          skipReactNativeReload: true,
        },
        async () => {
          await TestSnaps.tapButton('sendAlertButton');
          await Assertions.expectTextDisplayed(
            'This is an alert dialog. It has a single button: "OK".',
          );

          await TestSnaps.tapOkButton();
          await TestSnaps.checkResultSpan('dialogResultSpan', 'null');
        },
      );
    });
  });

  describe('confirmation', () => {
    it('shows a confirmation dialog', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          skipReactNativeReload: true,
        },
        async () => {
          await TestSnaps.tapButton('sendConfirmationButton');
          await Assertions.expectTextDisplayed('Confirmation Dialog');

          await TestSnaps.tapApproveButton();
          await TestSnaps.checkResultSpan('dialogResultSpan', 'true');
        },
      );
    });

    it('shows a confirmation dialog and cancels', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          skipReactNativeReload: true,
        },
        async () => {
          await TestSnaps.tapButton('sendConfirmationButton');
          await Assertions.expectTextDisplayed('Confirmation Dialog');

          await TestSnaps.tapCancelButton();
          await TestSnaps.checkResultSpan('dialogResultSpan', 'false');
        },
      );
    });
  });

  describe('custom', () => {
    it('shows a custom dialog', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          skipReactNativeReload: true,
        },
        async () => {
          await TestSnaps.tapButton('sendCustomButton');
          await Assertions.expectTextDisplayed('Custom Dialog');

          const input = Matchers.getElementByID('custom-input-snap-ui-input');
          await Gestures.typeTextAndHideKeyboard(input, 'Hello, World!');

          await TestSnaps.tapConfirmButton();
          await TestSnaps.checkResultSpan(
            'dialogResultSpan',
            '"Hello, World!"',
          );
        },
      );
    });
  });
});
