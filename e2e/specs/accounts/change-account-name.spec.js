'use strict';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { Regression } from '../../tags.js';
import WalletView from '../../pages/wallet/WalletView';
import AccountActionsBottomSheet from '../../pages/wallet/AccountActionsBottomSheet';
import EditAccountNameView from '../../pages/wallet/EditAccountNameView';
import Assertions from '../../utils/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import LoginView from '../../pages/wallet/LoginView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import TestHelpers from '../../helpers';

const fixtureServer = new FixtureServer();
const NEW_ACCOUNT_NAME = 'Edited Name';
const NEW_IMPORTED_ACCOUNT_NAME = 'New Imported Account';
const MAIN_ACCOUNT_INDEX = 0;
const IMPORTED_ACCOUNT_INDEX = 1;

describe(Regression('Change Account Name'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withGanacheNetwork()
      .withImportedAccountKeyringController()
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
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
    await TabBarComponent.tapWallet();
    await WalletView.tapIdenticon();
    await AccountListBottomSheet.tapEditAccountActionsAtIndex(
      MAIN_ACCOUNT_INDEX,
    );
    await AccountActionsBottomSheet.tapEditAccount();
    await EditAccountNameView.updateAccountName(NEW_ACCOUNT_NAME);
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
    await Assertions.checkIfVisible(LoginView.container);

    // Unlock wallet and verify updated name persists
    await loginToApp();
    await Assertions.checkIfElementToHaveText(
      WalletView.accountName,
      NEW_ACCOUNT_NAME,
    );
  });

  it('import an account, edits the name, and verifies the new name persists after locking and unlocking the wallet', async () => {
    // Open account actions bottom sheet and choose imported account
    await WalletView.tapIdenticon();
    await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(
      IMPORTED_ACCOUNT_INDEX,
    );

    // Edit imported account name
    await WalletView.tapIdenticon();
    await AccountListBottomSheet.tapEditAccountActionsAtIndex(
      IMPORTED_ACCOUNT_INDEX,
    );
    await AccountActionsBottomSheet.tapEditAccount();

    await EditAccountNameView.updateAccountName(NEW_IMPORTED_ACCOUNT_NAME);
    await EditAccountNameView.tapSave();

    // Verify updated name
    await Assertions.checkIfElementToHaveText(
      WalletView.accountName,
      NEW_IMPORTED_ACCOUNT_NAME,
    );

    // Lock wallet
    await Assertions.checkIfVisible(TabBarComponent.tabBarSettingButton);
    await TabBarComponent.tapSettings();
    await SettingsView.scrollToLockButton();
    await SettingsView.tapLock();
    await SettingsView.tapYesAlertButton();
    await Assertions.checkIfVisible(LoginView.container);

    // Unlock wallet and verify updated name persists
    await loginToApp();
    await Assertions.checkIfElementToHaveText(
      WalletView.accountName,
      NEW_IMPORTED_ACCOUNT_NAME,
    );
  });
});
