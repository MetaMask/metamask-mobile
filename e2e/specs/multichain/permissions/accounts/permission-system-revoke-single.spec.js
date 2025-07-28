import TestHelpers from '../../../../helpers';
import { SmokeNetworkExpansion } from '../../../../tags';
import Browser from '../../../../pages/Browser/BrowserView';
import TabBarComponent from '../../../../pages/wallet/TabBarComponent';
import NetworkListModal from '../../../../pages/Network/NetworkListModal';
import ConnectedAccountsModal from '../../../../pages/Browser/ConnectedAccountsModal';
import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../../../viewHelper';
import Assertions from '../../../../framework/Assertions';
import { DappVariants } from '../../../../framework/Constants';

describe(SmokeNetworkExpansion('Account Permission Management'), () => {
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
        await TabBarComponent.tapBrowser();
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
