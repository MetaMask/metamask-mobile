import {
  RegressionNetworkExpansion,
  SmokeNetworkExpansion,
} from '../../../../../tags';
import { loginToApp, navigateToBrowserView } from '../../../../../viewHelper';
import Assertions from '../../../../../../tests/framework/Assertions';
import TestHelpers from '../../../../../helpers';
import FixtureBuilder from '../../../../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../../../tests/framework/fixtures/FixtureHelper';
import { CustomNetworks } from '../../../../../resources/networks.e2e';
import Browser from '../../../../../pages/Browser/BrowserView';
import TabBarComponent from '../../../../../pages/wallet/TabBarComponent';
import { NetworkNonPemittedBottomSheetSelectorsText } from '../../../../../../app/components/Views/NetworkConnect/NetworkNonPemittedBottomSheet.testIds';
import ConnectedAccountsModal from '../../../../../pages/Browser/ConnectedAccountsModal';
import NetworkConnectMultiSelector from '../../../../../pages/Browser/NetworkConnectMultiSelector';
import { DappVariants } from '../../../../../../tests/framework/Constants';
import WalletView from '../../../../../pages/wallet/WalletView';
import NetworkListModal from '../../../../../pages/Network/NetworkListModal';
import TestDApp from '../../../../../pages/Browser/TestDApp';
import ConnectBottomSheet from '../../../../../pages/Browser/ConnectBottomSheet';

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

describe(
  RegressionNetworkExpansion('Chain Permission System, non-permitted chain, '),
  () => {
    beforeAll(async () => {
      await TestHelpers.reverseServerPort();
    });

    beforeEach(() => {
      jest.setTimeout(150000);
    });

    it('should not request permission when switching to permitted chain in dApp', async () => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder()
            .withPermissionControllerConnectedToTestDapp()
            .withChainPermission([
              '0x1',
              CustomNetworks.Sepolia.providerConfig.chainId,
            ])
            .withPopularNetworks()
            .build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();

          // Switch to permitted network on dapp
          await navigateToBrowserView();
          await Browser.navigateToTestDApp();
          await TestDApp.verifyCurrentNetworkText('Ethereum Mainnet');
          await TestDApp.tapOpenNetworkPicker();
          await TestDApp.tapNetworkByName(SEPOLIA);
          await Assertions.expectElementToNotBeVisible(
            ConnectBottomSheet.connectButton,
          );

          if (device.getPlatform() === 'ios') {
            await Browser.tapHomeButton();
            await Browser.navigateToTestDApp();
          } else {
            await Browser.reloadTab();
          }
          await TestDApp.verifyCurrentNetworkText(SEPOLIA);
        },
      );
    });

    it('should not switch network in dapp when switching network in wallet', async () => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder()
            .withPermissionControllerConnectedToTestDapp()
            .withChainPermission([
              '0x1',
              CustomNetworks.Sepolia.providerConfig.chainId,
            ])
            .withPopularNetworks()
            .build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();

          // Switch to permitted network on dapp
          await navigateToBrowserView();
          await Browser.navigateToTestDApp();
          await TestDApp.verifyCurrentNetworkText('Ethereum Mainnet');

          await TabBarComponent.tapWallet();
          await WalletView.tapTokenNetworkFilter();
          await NetworkListModal.tapOnCustomTab();
          await NetworkListModal.changeNetworkTo('Sepolia');

          await navigateToBrowserView();
          if (device.getPlatform() === 'ios') {
            await Browser.tapHomeButton();
            await Browser.navigateToTestDApp();
          } else {
            await Browser.reloadTab();
          }
          await TestDApp.verifyCurrentNetworkText('Ethereum Mainnet');
        },
      );
    });
  },
);
