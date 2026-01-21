import { DappVariants } from '../../../framework/Constants';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT_2,
} from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import TestHelpers from '../../../helpers';
import { RegressionNetworkExpansion } from '../../../tags';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../../page-objects/viewHelper.ts';
import Browser from '../../../page-objects/Browser/BrowserView';
import ConnectBottomSheet from '../../../page-objects/Browser/ConnectBottomSheet';
import { requestPermissions } from '../../../helpers/multichain/connections/helpers';
import { withSolanaAccountEnabled } from '../../../utils/common-solana.ts';
import {
  navigateToSolanaTestDApp,
  connectSolanaTestDapp,
} from '../../../smoke/multichain/solana-wallet-standard/testHelpers';
import ConnectedAccountsModal from '../../../page-objects/Browser/ConnectedAccountsModal';
import NetworkConnectMultiSelector from '../../../page-objects/Browser/NetworkConnectMultiSelector';
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
        { evmAccountPermitted: true },
        async () => {
          await navigateToSolanaTestDApp();
          await connectSolanaTestDapp({
            // Validate the prompted accounts
            assert: async () => {
              await Assertions.expectTextDisplayed('Account 1');
              await Assertions.expectTextDisplayed('Solana Account 1');
            },
          });

          // Validate both EVM and Solana accounts are connected
          await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
          await Assertions.expectTextDisplayed('Account 1');
          await Assertions.expectTextDisplayed('Solana Account 1');

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

          // Validate the prompted accounts
          await Assertions.expectTextDisplayed('Account 1');
          await Assertions.expectTextDisplayed('Solana Account 1');

          await ConnectBottomSheet.tapConnectButton();

          //Validate both EVM and Solana accounts are connected
          await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
          await Assertions.expectTextDisplayed('Account 1');
          await Assertions.expectTextDisplayed('Solana Account 1');

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
