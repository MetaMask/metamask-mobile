import { DappVariants } from '../../../framework/Constants';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT_2,
} from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import TestHelpers from '../../../helpers';
import { RegressionNetworkExpansion } from '../../../tags';
import { loginToApp, navigateToBrowserView } from '../../../viewHelper';
import Browser from '../../../pages/Browser/BrowserView';
import ConnectBottomSheet from '../../../pages/Browser/ConnectBottomSheet';
import { requestPermissions } from './helpers';
import { withSolanaAccountEnabled } from '../../../common-solana';
import {
  navigateToSolanaTestDApp,
  connectSolanaTestDapp,
} from '../solana-wallet-standard/testHelpers';
import ConnectedAccountsModal from '../../../pages/Browser/ConnectedAccountsModal';
import NetworkConnectMultiSelector from '../../../pages/Browser/NetworkConnectMultiSelector';
import Assertions from '../../../framework/Assertions';
import { NetworkNonPemittedBottomSheetSelectorsText } from '../../../../app/components/Views/NetworkConnect/NetworkNonPemittedBottomSheet.testIds';

describe(
  RegressionNetworkExpansion('Multiple Provider Connections [Regression]'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    it('should default account selection to both accounts when "wallet_requestPermissions" is called with specific account while another is already connected', async () => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder()
            .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
            .withPermissionControllerConnectedToTestDapp()
            .withChainPermission() // Initialize with Ethereum mainnet only
            .build(),
          restartDevice: true,
        },
        async () => {
          await TestHelpers.reverseServerPort();
          await loginToApp();

          await navigateToBrowserView();
          await Browser.navigateToTestDApp();

          await requestPermissions({
            accounts: [DEFAULT_FIXTURE_ACCOUNT_2],
          });

          // Validate that the prompted account is the one that is already permitted
          await Assertions.expectTextDisplayed('Account 1');
          await Assertions.expectTextDisplayed('Account 2');

          await ConnectBottomSheet.tapConnectButton();

          // Validate both EVM accounts are connected
          await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
          await Assertions.expectTextDisplayed('Account 1');
          await Assertions.expectTextDisplayed('Account 2');
        },
      );
    });

    it('should retain EVM permissions when connecting through the Solana Wallet Standard', async () => {
      await withSolanaAccountEnabled(
        { numberOfAccounts: 0, evmAccountPermitted: true },
        async () => {
          await navigateToSolanaTestDApp();
          await connectSolanaTestDapp({
            assert: async () => {
              await Assertions.expectTextDisplayed('Account 1');
            },
          });

          await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
          await Assertions.expectTextDisplayed('Account 1');

          // Navigate to the permissions summary tab
          await ConnectedAccountsModal.tapManagePermissionsButton();
          await ConnectedAccountsModal.tapPermissionsSummaryTab();
          await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

          // Validate EVM Chain Permissions still exists
          await NetworkConnectMultiSelector.isNetworkChainPermissionSelected(
            NetworkNonPemittedBottomSheetSelectorsText.ETHEREUM_MAIN_NET_NETWORK_NAME,
          );
        },
      );
    });

    it('should be able to request specific chains when connecting through the EVM provider with existing permissions', async () => {
      await withSolanaAccountEnabled(
        {
          numberOfAccounts: 0,
          solanaAccountPermitted: true,
          dappVariant: DappVariants.TEST_DAPP,
        },
        async () => {
          await navigateToBrowserView();
          await Browser.navigateToTestDApp();

          //Request only Ethereum Mainnet
          await requestPermissions({
            params: [
              {
                'endowment:permitted-chains': {
                  caveats: [
                    { type: 'restrictNetworkSwitching', value: ['0x1'] },
                  ],
                },
              },
            ],
          });

          await Assertions.expectTextDisplayed('Account 1');

          await ConnectBottomSheet.tapConnectButton();

          await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
          await Assertions.expectTextDisplayed('Account 1');

          // Navigate to the permissions summary tab
          await ConnectedAccountsModal.tapManagePermissionsButton();
          await ConnectedAccountsModal.tapPermissionsSummaryTab();
          await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

          //Validate Solana Permissions still exists
          await NetworkConnectMultiSelector.isNetworkChainPermissionSelected(
            NetworkNonPemittedBottomSheetSelectorsText.SOLANA_NETWORK_NAME,
          );

          //Validate Ethereum Mainnet Permissions now exist
          await NetworkConnectMultiSelector.isNetworkChainPermissionSelected(
            NetworkNonPemittedBottomSheetSelectorsText.ETHEREUM_MAIN_NET_NETWORK_NAME,
          );

          //Validate no other network Permissions exist
          await NetworkConnectMultiSelector.isNetworkChainPermissionNotSelected(
            NetworkNonPemittedBottomSheetSelectorsText.LINEA_MAINNET_NETWORK_NAME,
          );
        },
      );
    });
  },
);
