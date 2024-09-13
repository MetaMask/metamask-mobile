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
      ganacheOptions: defaultGanacheOptions,
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('renames an account and verifies the new name persists after locking and unlocking the wallet', async () => {
    // Open account actions and edit account name
    await WalletView.tapMainWalletAccountActions();
    await AccountActionsModal.tapEditAccount();
    await Gestures.clearField(EditAccountNameView.accountNameInput());
    await TestHelpers.typeTextAndHideKeyboard(
      EditAccountNameSelectorIDs.ACCOUNT_NAME_INPUT,
      NEW_ACCOUNT_NAME,
    );
    await EditAccountNameView.tapSave();

    // Verify updated name
    await Assertions.checkIfElementToHaveText(
      WalletView.accountName,
      NEW_ACCOUNT_NAME,
    );

    // Lock wallet
    await Assertions.checkIfVisible(TabBarComponent.tabBarSettingButton);
    await TabBarComponent.tapSettings();
    await SettingsView.scrollToLockButton();
    await SettingsView.tapLock();
    await SettingsView.tapYesAlertButton();
    await LoginView.isVisible();

    // Unlock wallet and verify updated name persists
    await loginToApp();
    await Assertions.checkIfElementToHaveText(
      WalletView.accountName,
      NEW_ACCOUNT_NAME,
    );
  });
});
