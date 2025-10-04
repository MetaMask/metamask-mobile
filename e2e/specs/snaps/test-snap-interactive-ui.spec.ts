import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestSnaps from '../../pages/Browser/TestSnaps';
import { Assertions } from '../../framework';
import Matchers from '../../utils/Matchers';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Interactive UI Snap Tests'), () => {
  it('can connect to the Interactive UI Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectInteractiveButton');
      },
    );
  });

  it('renders an interactive UI', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
      },
      async () => {
        await TestSnaps.tapButton('createDialogButton');

        await TestSnaps.fillInput('example-input', 'foo bar');
        await TestSnaps.selectInNativeDropdown('snapUIDropdown', 'Option 2');
        await TestSnaps.selectRadioButton('Option 1');
        await TestSnaps.tapCheckbox();
        await TestSnaps.selectInNativeDropdown('snapUISelector', 'Option 3');
        await TestSnaps.tapSubmitButton();

        await Assertions.expectTextDisplayed('foo bar');
        await Assertions.expectTextDisplayed('option2');
        await Assertions.expectTextDisplayed('option1');
        await Assertions.expectTextDisplayed('true');
        await Assertions.expectTextDisplayed('option3');

        await TestSnaps.tapOkButton();
      },
    );
  });

  it('renders a disabled UI', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
      },
      async () => {
        await TestSnaps.tapButton('createDialogDisabledButton');

        const input = Matchers.getElementByID('example-input-snap-ui-input');
        await Assertions.expectElementToBeVisible(input);

        await Assertions.checkIfDisabled(input);
        await Assertions.checkIfDisabled(
          Matchers.getElementByID('snap-ui-renderer__dropdown'),
        );
        await Assertions.checkIfDisabled(
          Matchers.getElementByID('snap-ui-renderer__radio'),
        );
        await Assertions.checkIfDisabled(
          Matchers.getElementByID('snap-ui-renderer__checkbox'),
        );
        await Assertions.checkIfDisabled(
          Matchers.getElementByID('snap-ui-renderer__selector'),
        );
        await Assertions.checkIfDisabled(Matchers.getElementByText('Submit'));

        await TestSnaps.tapCancelButton();
      },
    );
  });
});
