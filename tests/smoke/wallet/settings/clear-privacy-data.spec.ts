import { RegressionWalletUX } from '../../../../e2e/tags';
import SettingsView from '../../../../e2e/pages/Settings/SettingsView';
import SecurityAndPrivacyView from '../../../../e2e/pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import { loginToApp, navigateToBrowserView } from '../../../../e2e/viewHelper';
import TabBarComponent from '../../../../e2e/pages/wallet/TabBarComponent';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import Assertions from '../../../framework/Assertions';
import ClearPrivacyModal from '../../../../e2e/pages/Settings/SecurityAndPrivacy/ClearPrivacyModal';
import BrowserView from '../../../../e2e/pages/Browser/BrowserView';
import ConnectedAccountsModal from '../../../../e2e/pages/Browser/ConnectedAccountsModal';
import { DappVariants } from '../../../framework/Constants';

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
