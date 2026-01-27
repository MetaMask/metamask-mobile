import { RegressionWalletUX } from '../../../../e2e/tags';
import SettingsView from '../../../../e2e/pages/Settings/SettingsView.ts';
import SecurityAndPrivacyView from '../../../../e2e/pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView.ts';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../../../e2e/viewHelper.ts';
import TabBarComponent from '../../../../e2e/pages/wallet/TabBarComponent.ts';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.ts';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.ts';
import Assertions from '../../../framework/Assertions.ts';
import ClearPrivacyModal from '../../../../e2e/pages/Settings/SecurityAndPrivacy/ClearPrivacyModal.ts';
import BrowserView from '../../../../e2e/pages/Browser/BrowserView.ts';
import ConnectedAccountsModal from '../../../../e2e/pages/Browser/ConnectedAccountsModal.ts';
import { DappVariants } from '../../../framework/Constants.ts';

describe(RegressionWalletUX('Clear Privacy data'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('should clear all dapp connections', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await navigateToBrowserView();
        await BrowserView.navigateToTestDApp();
        await BrowserView.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectElementToBeVisible(ConnectedAccountsModal.title);
        await ConnectedAccountsModal.scrollToBottomOfModal();

        // should go to settings then security & privacy
        await TabBarComponent.tapSettings();
        await SettingsView.tapSecurityAndPrivacy();
        await SecurityAndPrivacyView.scrollToClearPrivacyData();
        await SecurityAndPrivacyView.tapClearPrivacyData();

        await Assertions.expectElementToBeVisible(ClearPrivacyModal.container);
        await ClearPrivacyModal.tapClearButton();

        await navigateToBrowserView();
        await BrowserView.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectElementToNotBeVisible(
          ConnectedAccountsModal.title,
        );
      },
    );
  });
});
