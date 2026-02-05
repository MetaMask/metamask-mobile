import TestHelpers from '../../../../../e2e/helpers';
import { RegressionNetworkExpansion } from '../../../../../e2e/tags';
import Browser from '../../../../../e2e/pages/Browser/BrowserView';
import NetworkListModal from '../../../../../e2e/pages/Network/NetworkListModal';
import ConnectedAccountsModal from '../../../../../e2e/pages/Browser/ConnectedAccountsModal';
import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../../../../e2e/viewHelper';
import Assertions from '../../../../framework/Assertions';
import { DappVariants } from '../../../../framework/Constants';

describe(RegressionNetworkExpansion('Chain Permission Management'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('removes chain access permission while maintaining account connections', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .withChainPermission()
          .build(),
        restartDevice: true,
      },
      async () => {
        // Step 1: Navigate to browser view
        await loginToApp();
        await navigateToBrowserView();
        await Assertions.expectElementToBeVisible(Browser.browserScreenID);

        // Step 2: Navigate to test dApp and open network settings
        await Browser.navigateToTestDApp();
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();

        // Step 3: Navigate through permission management flow
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
        await ConnectedAccountsModal.tapSelectAllNetworksButton();
        await ConnectedAccountsModal.tapDeselectAllNetworksButton();
        await ConnectedAccountsModal.tapDisconnectNetworksButton();
        await ConnectedAccountsModal.tapConfirmDisconnectNetworksButton();

        // Step 4: Verify UI state after permission removal
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectElementToNotBeVisible(
          ConnectedAccountsModal.title,
        );
        await Assertions.expectElementToBeVisible(
          NetworkListModal.networkScroll,
        );
        await NetworkListModal.swipeToDismissModal();
        await Assertions.expectElementToNotBeVisible(
          NetworkListModal.networkScroll,
        );
      },
    );
  });
});
