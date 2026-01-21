import { SmokeAccounts } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import LoginView from '../../pages/wallet/LoginView';
import WalletView from '../../pages/wallet/WalletView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import Assertions from '../../framework/Assertions';
import { loginToApp } from '../../viewHelper';

const PASSWORD = '123123123';

describe(SmokeAccounts('Wallet Lock/Unlock Flow'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('should allow user to lock and unlock the wallet', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        // Login to app
        await loginToApp();

        // Verify user is on Wallet screen
        await Assertions.expectElementToBeVisible(WalletView.container);

        // Navigate to Settings and Lock the app
        await TabBarComponent.tapSettings();
        await SettingsView.tapLock();
        await SettingsView.tapYesAlertButton();

        // Verify Login screen is visible
        await Assertions.expectElementToBeVisible(LoginView.container);

        // Unlock the app by entering password
        await LoginView.enterPassword(PASSWORD);

        // Verify user is back on Wallet screen
        await Assertions.expectElementToBeVisible(WalletView.container);
      },
    );
  });

  it('should allow multiple lock/unlock cycles', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        // First unlock
        await loginToApp();
        await Assertions.expectElementToBeVisible(WalletView.container);

        // First lock
        await TabBarComponent.tapSettings();
        await SettingsView.tapLock();
        await SettingsView.tapYesAlertButton();
        await Assertions.expectElementToBeVisible(LoginView.container);

        // Second unlock
        await LoginView.enterPassword(PASSWORD);
        await Assertions.expectElementToBeVisible(WalletView.container);

        // Second lock
        await TabBarComponent.tapSettings();
        await SettingsView.tapLock();
        await SettingsView.tapYesAlertButton();
        await Assertions.expectElementToBeVisible(LoginView.container);

        // Third unlock
        await LoginView.enterPassword(PASSWORD);
        await Assertions.expectElementToBeVisible(WalletView.container);
      },
    );
  });
});
