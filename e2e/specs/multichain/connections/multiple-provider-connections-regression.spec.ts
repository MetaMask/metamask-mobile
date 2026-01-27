import { DappVariants } from '../../../../tests/framework/Constants';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT_2,
} from '../../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../tests/framework/fixtures/FixtureHelper';
import TestHelpers from '../../../helpers';
import { RegressionNetworkExpansion } from '../../../tags';
import { loginToApp, navigateToBrowserView } from '../../../viewHelper';
import Browser from '../../../pages/Browser/BrowserView';
import ConnectBottomSheet from '../../../pages/Browser/ConnectBottomSheet';
import { requestPermissions } from './helpers';
import {
  navigateToSolanaTestDApp,
  connectSolanaTestDapp,
} from '../solana-wallet-standard/testHelpers';
import ConnectedAccountsModal from '../../../pages/Browser/ConnectedAccountsModal';
import NetworkConnectMultiSelector from '../../../pages/Browser/NetworkConnectMultiSelector';
import Assertions from '../../../../tests/framework/Assertions';
import { NetworkNonPemittedBottomSheetSelectorsText } from '../../../../app/components/Views/NetworkConnect/NetworkNonPemittedBottomSheet.testIds';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../../../tests/api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from '../../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';

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
      await withFixtures(
        {
          fixture: new FixtureBuilder().withChainPermission(['0x1']).build(),
          dapps: [
            {
              dappVariant: DappVariants.SOLANA_TEST_DAPP,
            },
          ],
          restartDevice: true,
          testSpecificMock: async (mockServer) => {
            await setupRemoteFeatureFlagsMock(
              mockServer,
              remoteFeatureMultichainAccountsAccountDetailsV2(true),
            );
          },
        },
        async () => {
          await loginToApp();
          await navigateToSolanaTestDApp();
          await connectSolanaTestDapp({
            // Validate the prompted accounts
            assert: async () => {
              await Assertions.expectTextDisplayed('Account 1');
            },
          });
          // Validate both EVM and Solana accounts are connected
          await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
          await Assertions.expectTextDisplayed('Account 1');

          // Navigate to the permissions summary tab
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
      await withFixtures(
        {
          fixture: new FixtureBuilder().withSolanaAccountPermission().build(),
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          restartDevice: true,
          testSpecificMock: async (mockServer) => {
            await setupRemoteFeatureFlagsMock(
              mockServer,
              remoteFeatureMultichainAccountsAccountDetailsV2(true),
            );
          },
        },
        async () => {
          await loginToApp();
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

          await ConnectBottomSheet.tapConnectButton();

          //Validate both EVM and Solana accounts are connected
          await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
          await Assertions.expectTextDisplayed('Account 1');

          // Navigate to the permissions summary tab
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
            NetworkNonPemittedBottomSheetSelectorsText.TRON_NETWORK_NAME,
          );

          //Validate no other network Permissions exist
          await NetworkConnectMultiSelector.isNetworkChainPermissionNotSelected(
            NetworkNonPemittedBottomSheetSelectorsText.BITCOIN_NETWORK_NAME,
          );
        },
      );
    });
  },
);
