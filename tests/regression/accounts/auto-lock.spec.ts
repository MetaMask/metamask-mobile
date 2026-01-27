import { RegressionAccounts } from '../../../e2e/tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import TabBarComponent from '../../../e2e/pages/wallet/TabBarComponent.ts';
import SettingsView from '../../../e2e/pages/Settings/SettingsView.ts';
import SecurityAndPrivacy from '../../../e2e/pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView.ts';
import AutoLockModal from '../../../e2e/pages/Settings/SecurityAndPrivacy/AutoLockModal.ts';
import WalletView from '../../../e2e/pages/wallet/WalletView.ts';
import LoginView from '../../../e2e/pages/wallet/LoginView.ts';
import Assertions from '../../framework/Assertions.ts';
import TestHelpers from '../../../e2e/helpers.js';
import { logger } from '../../framework/logger.ts';
import { loginToApp } from '../../../e2e/viewHelper.ts';

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
