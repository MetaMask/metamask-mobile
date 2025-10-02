import { SmokeNetworkExpansion } from '../../../tags';
import Assertions from '../../../framework/Assertions';
import TestHelpers from '../../../helpers';
import { withSolanaAccountEnabled } from '../../../common-solana';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
  DEFAULT_FIXTURE_ACCOUNT_2,
} from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import TestDApp from '../../../pages/Browser/TestDApp';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import Browser from '../../../pages/Browser/BrowserView';
import { BrowserViewSelectorsIDs } from '../../../selectors/Browser/BrowserView.selectors';
import ConnectBottomSheet from '../../../pages/Browser/ConnectBottomSheet';
import ConnectedAccountsModal from '../../../pages/Browser/ConnectedAccountsModal';
import NetworkConnectMultiSelector from '../../../pages/Browser/NetworkConnectMultiSelector';
import { NetworkNonPemittedBottomSheetSelectorsText } from '../../../selectors/Network/NetworkNonPemittedBottomSheet.selectors';
import {
  connectSolanaTestDapp,
  navigateToSolanaTestDApp,
} from '../solana-wallet-standard/testHelpers';
import { loginToApp } from '../../../viewHelper';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import Matchers from '../../../framework/Matchers';
import { DappVariants } from '../../../framework/Constants';
import { createLogger } from '../../../framework/logger';

const logger = createLogger({
  name: 'multiple-provider-connections.spec.ts',
});

async function requestPermissions({
  accounts,
  params,
}: {
  accounts?: string[];
  params?: unknown[];
} = {}) {
  logger.debug('Starting requestPermissions');
  const nativeWebView = Matchers.getWebViewByID(
    BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
  );
  const bodyElement = nativeWebView.element(by.web.tag('body'));

  const requestPermissionsRequest = JSON.stringify({
    jsonrpc: '2.0',
    method: 'wallet_requestPermissions',
    params: params ?? [
      {
        eth_accounts: accounts
          ? { caveats: [{ type: 'restrictReturnedAccounts', value: accounts }] }
          : {},
      },
    ],
  });

  await bodyElement.runScript(
    `(el) => { window.ethereum.request(${requestPermissionsRequest}); }`,
  );
  logger.debug('Done requestPermissions');
}

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

        await TabBarComponent.tapBrowser();
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

        await TabBarComponent.tapBrowser();
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
    await withSolanaAccountEnabled({ evmAccountPermitted: true }, async () => {
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
    });
  });

  it('should retain Solana permissions when connecting through the EVM provider', async () => {
    await withSolanaAccountEnabled(
      {
        solanaAccountPermitted: true,
        dappVariant: DappVariants.TEST_DAPP,
      },
      async () => {
        await TabBarComponent.tapBrowser();
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
        await TabBarComponent.tapBrowser();
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

  it('should be able to request specific chains when connecting through the EVM provider with existing permissions', async () => {
    await withSolanaAccountEnabled(
      {
        solanaAccountPermitted: true,
        dappVariant: DappVariants.TEST_DAPP,
      },
      async () => {
        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();

        //Request only Ethereum Mainnet
        await requestPermissions({
          params: [
            {
              'endowment:permitted-chains': {
                caveats: [{ type: 'restrictNetworkSwitching', value: ['0x1'] }],
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
});
