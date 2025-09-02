import { RegressionAccounts } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import AutoLockModal from '../../pages/Settings/SecurityAndPrivacy/AutoLockModal';
import WalletView from '../../pages/wallet/WalletView';
import LoginView from '../../pages/wallet/LoginView';
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers.js';
import { logger } from '../../framework/logger';
import { loginToApp } from '../../viewHelper';

const isIOS = device.getPlatform() === 'ios';
(isIOS ? describe : describe.skip)(RegressionAccounts('Auto-Lock'), () => {
  it('backgrounds then relaunches without needing password on default auto-lock setting', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withImportedAccountKeyringController()
          .build(),
        restartDevice: true,
      },
      async () => {
        await device.sendToHome();
        // await TestHelpers.launchApp();
        logger.debug('launching app');
        await device.launchApp({ newInstance: false });
      },
    );
  });

  it('sets auto-lock to immediately then requires password to reopen from background', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withImportedAccountKeyringController()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapSettings();
        await SettingsView.tapSecurityAndPrivacy();
        await SecurityAndPrivacy.scrollToAutoLockSection();
        await SecurityAndPrivacy.tapAutoLock30Seconds();
        await AutoLockModal.tapAutoLockImmediately();
        await TabBarComponent.tapWallet();
        await device.sendToHome();
        await TestHelpers.launchApp();
        await Assertions.expectElementToNotBeVisible(WalletView.container);
        await Assertions.expectElementToBeVisible(LoginView.container);
      },
    );
  });
});
