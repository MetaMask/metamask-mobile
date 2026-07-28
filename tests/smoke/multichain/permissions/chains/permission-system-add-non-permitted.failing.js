import { SmokeNetworkExpansion } from '../../../../tags';
import { loginToApp } from '../../../../flows/wallet.flow';
import { navigateToBrowserView } from '../../../../flows/browser.flow';
import Assertions from '../../../../framework/Assertions';
import TestHelpers from '../../../../helpers';
import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper';
import { CustomNetworks } from '../../../../resources/networks.e2e';
import Browser from '../../../../page-objects/Browser/BrowserView';
import { NetworkNonPemittedBottomSheetSelectorsText } from '../../../../../app/components/Views/NetworkConnect/NetworkNonPemittedBottomSheet.testIds';
import ConnectedAccountsModal from '../../../../page-objects/Browser/ConnectedAccountsModal';
import NetworkConnectMultiSelector from '../../../../page-objects/Browser/NetworkConnectMultiSelector';
import { DappVariants } from '../../../../framework/Constants';
import TestDApp from '../../../../page-objects/Browser/TestDApp';
import ConnectBottomSheet from '../../../../page-objects/Browser/ConnectBottomSheet';

const SEPOLIA = CustomNetworks.Sepolia.providerConfig.nickname;
const ETHEREUM_MAIN_NET_NETWORK_NAME =
  NetworkNonPemittedBottomSheetSelectorsText.ETHEREUM_MAIN_NET_NETWORK_NAME;

describe(
  SmokeNetworkExpansion('Chain Permission System, non-permitted chain, '),
  () => {
    beforeAll(async () => {
      await TestHelpers.reverseServerPort();
    });

    beforeEach(() => {
      jest.setTimeout(150000);
    });

    it('should request permission when switching to non-permitted chain from dapp', async () => {
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
            .withPopularNetworks()
            .build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();

          // Switch to non-permitted network on dapp
          await navigateToBrowserView();
          await Browser.navigateToTestDApp();
          await TestDApp.tapOpenNetworkPicker();
          await TestDApp.tapNetworkByName(SEPOLIA);
          const expectedText = `Use your enabled networks Requesting for ${SEPOLIA}`;
          await Assertions.expectElementToHaveLabel(
            ConnectedAccountsModal.navigateToEditNetworksPermissionsButton,
            expectedText,
            {
              description: `edit networks permissions button should show "${expectedText}"`,
            },
          );
          await Assertions.expectElementToBeVisible(
            ConnectBottomSheet.connectButton,
          );
          await ConnectBottomSheet.tapConnectButton();
        },
      );
    });

    it('should allow adding new chain permission through edit permissions', async () => {
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
          await loginToApp();

          // Add network permission
          await navigateToBrowserView();
          await Browser.navigateToTestDApp();

          // Verify the permission was added by checking that disconnecting both networks shows disconnect all button
          await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
          await ConnectedAccountsModal.tapManagePermissionsButton();
          await ConnectedAccountsModal.tapPermissionsSummaryTab();
          await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
          await NetworkConnectMultiSelector.selectNetworkChainPermission(
            SEPOLIA,
          );
          await NetworkConnectMultiSelector.tapUpdateButton();
          await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
          await NetworkConnectMultiSelector.selectNetworkChainPermission(
            ETHEREUM_MAIN_NET_NETWORK_NAME,
          );
          await NetworkConnectMultiSelector.selectNetworkChainPermission(
            SEPOLIA,
          );
          await Assertions.expectElementToBeVisible(
            ConnectedAccountsModal.disconnectNetworksButton,
          );
        },
      );
    });
  },
);
