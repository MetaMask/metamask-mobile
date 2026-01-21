import { RegressionWalletUX } from '../../tags';
import SettingsView from '../../page-objects/Settings/SettingsView';
import SecurityAndPrivacyView from '../../page-objects/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../page-objects/viewHelper.ts';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';
import ClearPrivacyModal from '../../page-objects/Settings/SecurityAndPrivacy/ClearPrivacyModal';
import BrowserView from '../../page-objects/Browser/BrowserView';
import ConnectedAccountsModal from '../../page-objects/Browser/ConnectedAccountsModal';
import { DappVariants } from '../../framework/Constants';

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
