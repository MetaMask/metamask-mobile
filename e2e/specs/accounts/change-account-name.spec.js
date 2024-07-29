'use strict';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { Regression } from '../../tags.js';
import WalletView from '../../pages/wallet/WalletView';
import AccountActionsModal from '../../pages/modals/AccountActionsModal';
import AccountListView from '../../pages/AccountListView';
import EditAccountNameView from '../../pages/EditAccountNameView';
import EditAccountNameSelectorIDs from '../../selectors/EditAccountName.selectors';
import Gestures from '../../utils/Gestures';
import Assertions from '../../utils/Assertions';
import TabBarComponent from '../../pages/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import LoginView from '../../pages/LoginView';

const fixtureServer = new FixtureServer();
const NEW_ACCOUNT_NAME = 'Edited Name';

describe(Regression('Change Account Name'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().withGanacheNetwork().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp({
      permissions: { notifications: 'YES' },
      ganacheOptions: defaultGanacheOptions,
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });
  it('renames an account', async () => {
    await WalletView.tapMainWalletAccountActions();
    await AccountActionsModal.tapEditAccount();
    await Gestures.clearField(EditAccountNameView.accountNameInput());
    await TestHelpers.typeText(
      EditAccountNameSelectorIDs.ACCOUNT_NAME_INPUT,
      NEW_ACCOUNT_NAME,
    );
    await EditAccountNameView.tapSave();

    // Conditionally execute for Android
    if (device.getPlatform() === 'android') {
      await WalletView.tapIdenticon();
      await Assertions.checkIfTextIsDisplayed(NEW_ACCOUNT_NAME);
      await AccountListView.swipeToDimssAccountsModal();
    } else {
      await Assertions.checkIfTextIsDisplayed(NEW_ACCOUNT_NAME);
    }

    // Lock wallet
    await TabBarComponent.tapSettings();
    await SettingsView.scrollToLockButton();
    await SettingsView.tapLock();
    await SettingsView.tapYesAlertButton();
    await LoginView.isVisible();

    // Unlock and confirm custom name persists
    await loginToApp();

    // Conditionally execute for Android
    if (device.getPlatform() === 'android') {
      await WalletView.tapIdenticon();
    }

    await Assertions.checkIfTextIsDisplayed(NEW_ACCOUNT_NAME);
  });
});
