import TestHelpers from '../../../../helpers';
import { RegressionNetworkExpansion } from '../../../../tags';
import Browser from '../../../../page-objects/Browser/BrowserView';
import NetworkListModal from '../../../../page-objects/Network/NetworkListModal';
import ConnectedAccountsModal from '../../../../page-objects/Browser/ConnectedAccountsModal';
import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../../../page-objects/viewHelper';
import Assertions from '../../../../framework/Assertions';
import { DappVariants } from '../../../../framework/Constants';

describe(RegressionNetworkExpansion('Account Permission Management'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('revokes dapp access for single account while maintaining other connections', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await Assertions.expectElementToBeVisible(Browser.browserScreenID);
        await Browser.navigateToTestDApp();
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();

        await ConnectedAccountsModal.tapManagePermissionsButton();

        await ConnectedAccountsModal.tapDisconnectAllAccountsAndNetworksButton();
        await ConnectedAccountsModal.tapConfirmDisconnectNetworksButton();

        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectElementToNotBeVisible(
          ConnectedAccountsModal.title,
        );
        await Assertions.expectElementToBeVisible(
          NetworkListModal.networkScroll,
        );
      },
    );
  });
});
