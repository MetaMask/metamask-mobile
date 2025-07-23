import TestHelpers from '../../helpers';
import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { getFixturesServerPort } from '../../fixtures/utils';
import FixtureServer from '../../fixtures/fixture-server';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestSnaps from '../../pages/Browser/TestSnaps';
import Assertions from '../../framework/Assertions';
import Gestures from '../../utils/Gestures';
import { Matchers } from '../../framework';

const fixtureServer = new FixtureServer();

describe(FlaskBuildTests('Dialog Snap Tests'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withMultiSRPKeyringController()
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();

    // Navigate to test snaps URL once for all tests
    await TabBarComponent.tapBrowser();
    await TestSnaps.navigateToTestSnap();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(() => {
    jest.setTimeout(150_000);
  });

  it('connects to the Dialog Snap', async () => {
    await TestSnaps.installSnap('connectDialogSnapButton');
  });

  describe('alert', () => {
    it('shows an alert dialog', async () => {
      await TestSnaps.tapButton('sendAlertButton');
      await Assertions.expectTextDisplayed(
        'This is an alert dialog. It has a single button: "OK".',
      );

      await TestSnaps.tapOkButton();
      await TestSnaps.checkResultSpan('dialogResultSpan', 'null');
    });
  });

  describe('confirmation', () => {
    it('shows a confirmation dialog', async () => {
      await TestSnaps.tapButton('sendConfirmationButton');
      await Assertions.expectTextDisplayed('Confirmation Dialog');

      await TestSnaps.tapApproveButton();
      await TestSnaps.checkResultSpan('dialogResultSpan', 'true');
    });

    it('shows a confirmation dialog and cancels', async () => {
      await TestSnaps.tapButton('sendConfirmationButton');
      await Assertions.expectTextDisplayed('Confirmation Dialog');

      await TestSnaps.tapCancelButton();
      await TestSnaps.checkResultSpan('dialogResultSpan', 'false');
    });
  });

  describe('prompt', () => {
    // Prompt dialogs are not implemented yet.
    it.todo('shows a prompt dialog');
  });

  describe('custom', () => {
    it('shows a custom dialog', async () => {
      await TestSnaps.tapButton('sendCustomButton');
      await Assertions.expectTextDisplayed('Custom Dialog');

      const input = Matchers.getElementByID('custom-input-snap-ui-input');
      await Gestures.typeTextAndHideKeyboard(input, 'Hello, World!');

      await TestSnaps.tapConfirmButton();
      await TestSnaps.checkResultSpan('dialogResultSpan', '"Hello, World!"');
    });
  });
});
