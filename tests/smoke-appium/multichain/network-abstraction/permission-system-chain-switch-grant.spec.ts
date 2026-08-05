import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { SmokeNetworkAbstractions } from '../../../tags.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import { navigateToBrowserView } from '../../../flows/browser.flow.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import Assertions from '../../../framework/Assertions.js';
import { DappVariants } from '../../../framework/Constants.js';
import { CustomNetworks } from '../../../resources/networks.e2e.js';
import { CUSTOM_RPC_PROVIDER_MOCKS } from '../../../api-mocking/mock-responses/custom-rpc-provider-mocks.js';
import Browser from '../../../page-objects/Browser/BrowserView.js';
import TestDApp from '../../../page-objects/Browser/TestDApp.js';
import ConnectBottomSheet from '../../../page-objects/Browser/ConnectBottomSheet.js';
import ConnectedAccountsModal from '../../../page-objects/Browser/ConnectedAccountsModal.js';
import NetworkConnectMultiSelector from '../../../page-objects/Browser/NetworkConnectMultiSelector.js';
import NetworkNonPemittedBottomSheet from '../../../page-objects/Network/NetworkNonPemittedBottomSheet.js';

appiumTest.describe(SmokeNetworkAbstractions('Chain Permission System'), () => {
  appiumTest.describe.configure({ timeout: 300_000 });

  appiumTest.describe('When a dApp requests to switch to a new chain', () => {
    appiumTest(
      'grants permission to the new chain and switches to it when approved',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            dapps: [{ dappVariant: DappVariants.TEST_DAPP }],
            fixture: new FixtureBuilder()
              .withNetworkController(
                CustomNetworks.ElysiumTestnet.providerConfig,
              )
              .withNetworkController(
                CustomNetworks.EthereumMainCustom.providerConfig,
              )
              .build(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: CUSTOM_RPC_PROVIDER_MOCKS,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await navigateToBrowserView();

            await Browser.navigateToTestDApp();
            await TestDApp.tapDappConnectButton();
            await ConnectedAccountsModal.tapPermissionsSummaryTab();
            await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
            await NetworkNonPemittedBottomSheet.tapElysiumTestnetNetworkName();
            await NetworkConnectMultiSelector.tapUpdateButton();
            await ConnectBottomSheet.tapConnectButton();

            await Assertions.expectElementToBeVisible(Browser.addressBar);

            await TestDApp.tapSwitchChainButton();
            await ConnectBottomSheet.tapConnectButton();

            await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
            await ConnectedAccountsModal.tapPermissionsSummaryTab();

            await Assertions.expectElementToHaveLabel(
              ConnectedAccountsModal.networkPicker,
              'l, E',
            );
          },
        );
      },
    );
  });
});
