import { SmokeNetworkExpansion } from '../../../tags';
import Assertions from '../../../../tests/framework/Assertions';
import { withSolanaAccountEnabled } from '../../../common-solana';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
  DEFAULT_FIXTURE_ACCOUNT_2,
} from '../../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../tests/framework/fixtures/FixtureHelper';
import TestDApp from '../../../pages/Browser/TestDApp';
import Browser from '../../../pages/Browser/BrowserView';
import ConnectBottomSheet from '../../../pages/Browser/ConnectBottomSheet';
import ConnectedAccountsModal from '../../../pages/Browser/ConnectedAccountsModal';
import NetworkConnectMultiSelector from '../../../pages/Browser/NetworkConnectMultiSelector';
import { NetworkNonPemittedBottomSheetSelectorsText } from '../../../../app/components/Views/NetworkConnect/NetworkNonPemittedBottomSheet.testIds';
import { loginToApp, navigateToBrowserView } from '../../../viewHelper';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import { DappVariants } from '../../../../tests/framework/Constants';
import { createLogger } from '../../../../tests/framework/logger';
import { requestPermissions } from './helpers';

const logger = createLogger({
  name: 'multiple-provider-connections.spec.ts',
});

describe(SmokeNetworkExpansion('Multiple Standard Dapp Connections'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('should default account selection to already permitted account when "wallet_requestPermissions" is called with no accounts specified', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
          .withPermissionControllerConnectedToTestDapp({
            [Caip25EndowmentPermissionName]: {
              caveats: [
                {
                  type: Caip25CaveatType,
                  value: {
                    optionalScopes: {
                      'eip155:1': {
                        accounts: [
                          `eip155:1:${DEFAULT_FIXTURE_ACCOUNT_2.toLowerCase()}`,
                        ],
                      },
                    },
                    requiredScopes: {},
                    sessionProperties: {},
                    isMultichainOrigin: false,
                  },
                },
              ],
            },
          })
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await navigateToBrowserView();
        await Browser.navigateToTestDApp();

        logger.debug('requesting permissions');
        await requestPermissions();
        logger.debug('permissions requested');

        // Validate that the prompted account is the one that is already permitted
        await Assertions.expectTextDisplayed('Account 2');

        await ConnectBottomSheet.tapConnectButton();

        // Validate only existing permitted EVM account is connected
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectTextDisplayed('Account 2');
      },
    );
  });

  it('should retain Solana permissions when connecting through the EVM provider', async () => {
    await withSolanaAccountEnabled(
      {
        solanaAccountPermitted: true,
        dappVariant: DappVariants.TEST_DAPP,
      },
      async () => {
        await navigateToBrowserView();
        await Browser.navigateToTestDApp();
        await TestDApp.connect();

        // Validate the prompted accounts
        await Assertions.expectTextDisplayed('Account 1');
        await Assertions.expectTextDisplayed('Solana Account 1');

        await ConnectBottomSheet.tapConnectButton();

        // Validate both EVM and Solana accounts are connected
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectTextDisplayed('Account 1');
        await Assertions.expectTextDisplayed('Solana Account 1');

        // Navigate to the permissions summary tab
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

        // Validate Solana Chain Permissions still exists
        await NetworkConnectMultiSelector.isNetworkChainPermissionSelected(
          NetworkNonPemittedBottomSheetSelectorsText.SOLANA_NETWORK_NAME,
        );

        // Validate Ethereum Mainnet Permissions now exists
        await NetworkConnectMultiSelector.isNetworkChainPermissionSelected(
          NetworkNonPemittedBottomSheetSelectorsText.ETHEREUM_MAIN_NET_NETWORK_NAME,
        );
      },
    );
  });

  it('should default account selection to already permitted Solana account and requested Ethereum account when "wallet_requestPermissions" is called with specific Ethereum account', async () => {
    await withSolanaAccountEnabled(
      {
        solanaAccountPermitted: true,
        dappVariant: DappVariants.TEST_DAPP,
      },
      async () => {
        await navigateToBrowserView();
        await Browser.navigateToTestDApp();

        await requestPermissions({
          accounts: [DEFAULT_FIXTURE_ACCOUNT],
        });

        // Validate the prompted accounts
        await Assertions.expectTextDisplayed('Account 1');
        await Assertions.expectTextDisplayed('Solana Account 1');

        await ConnectBottomSheet.tapConnectButton();

        // Validate both EVM and Solana accounts are connected
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectTextDisplayed('Account 1');
        await Assertions.expectTextDisplayed('Solana Account 1');
      },
    );
  });
});
