'use strict';
import { SmokeMultiStandardDappConnection } from '../../../tags';
import Assertions from '../../../utils/Assertions';
import TestHelpers from '../../../helpers';
import { withSolanaAccountEnabled } from '../../../common-solana';
import MultichainTestDApp from '../../../pages/Browser/MultichainTestDApp';
import MultichainUtilities from '../../../utils/MultichainUtilities';
import FixtureBuilder, { DEFAULT_FIXTURE_ACCOUNT, DEFAULT_FIXTURE_ACCOUNT_2, DEFAULT_SOLANA_FIXTURE_ACCOUNT } from '../../../fixtures/fixture-builder';
import { SolScope } from '@metamask/keyring-api';
import { DEFAULT_MULTICHAIN_TEST_DAPP_PATH, DEFAULT_TEST_DAPP_PATH, withFixtures } from '../../../fixtures/fixture-helper';
import TestDApp from '../../../pages/Browser/TestDApp';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import Browser from '../../../pages/Browser/BrowserView';
import { BrowserViewSelectorsIDs } from '../../../selectors/Browser/BrowserView.selectors';
import ConnectBottomSheet from '../../../pages/Browser/ConnectBottomSheet';
import ConnectedAccountsModal from '../../../pages/Browser/ConnectedAccountsModal';
import NetworkConnectMultiSelector from '../../../pages/Browser/NetworkConnectMultiSelector';
import { NetworkNonPemittedBottomSheetSelectorsText } from '../../../selectors/Network/NetworkNonPemittedBottomSheet.selectors';
import { connectSolanaTestDapp, navigateToSolanaTestDApp } from '../solana-wallet-standard/testHelpers';
import { loginToApp } from '../../../viewHelper';

describe(SmokeMultiStandardDappConnection('Multiple Standard Dapp Connections'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  // it('should default account selection to already permitted account(s) plus the selected account (if not already permitted) when `wallet_requestPermissions` is called with no accounts specified', async () => { });

  it.only('should default account selection to both accounts when `wallet_requestPermissions` is called with specific account while another is already connected', async () => {
    await withFixtures({
      dapp: true,
      fixture: new FixtureBuilder()
        .withPermissionControllerConnectedToTestDapp()
        .withChainPermission() // Initialize with Ethereum mainnet only
        .build(),
      restartDevice: true,
    }, async () => {
      await TestHelpers.reverseServerPort();
      await loginToApp();

      await TabBarComponent.tapBrowser();
      await Browser.navigateToTestDApp();

      await TestHelpers.delay(3000);
      const myWebView = web(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID));
      const webElement = await myWebView.element(by.web.tag('body'));
      const requestPermissionsRequest = JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: { caveats: { type: 'restrictReturnedAccounts', value: [DEFAULT_FIXTURE_ACCOUNT_2] } } }],
      });

      // Wait for ethereum object to be available and then send the request
      await webElement.runScript(`(el, requestData) => {
        return new Promise((resolve, reject) => {
          const checkEthereum = () => {
            if (window.ethereum) {
              window.ethereum.request(JSON.parse(requestData))
                .then(result => {
                  console.log('Request successful:', result);
                  resolve(result);
                })
                .catch(error => {
                  console.error('Request failed:', error);
                  reject(error);
                });
            } else {
              console.log('Ethereum object not ready, retrying...');
              setTimeout(checkEthereum, 100);
            }
          };
          checkEthereum();
        });
      }`, [requestPermissionsRequest]);

      // // Validate both EVM and Solana accounts are connected
      // await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();

      // // Validate both EVM accounts are connected
      // await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
      // await Assertions.checkIfTextIsDisplayed('Account 1');
      // await Assertions.checkIfTextIsDisplayed('Account 2');
    });
  });

  it('should retain EVM permissions when connecting through the Solana Wallet Standard', async () => {
    await withSolanaAccountEnabled({ evmAccountPermitted: true }, async () => {
      await navigateToSolanaTestDApp();
      await connectSolanaTestDapp();

      // Validate both EVM and Solana accounts are connected
      await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
      await Assertions.checkIfTextIsDisplayed('Account 1');
      await Assertions.checkIfTextIsDisplayed('Solana Account 1');

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
    await withSolanaAccountEnabled({
      dappPath: DEFAULT_TEST_DAPP_PATH,
      solanaAccountPermitted: true,
    }, async () => {
      await TabBarComponent.tapBrowser();
      await Browser.navigateToTestDApp();
      await TestDApp.connect();
      await ConnectBottomSheet.tapConnectButton();

      // Validate both EVM and Solana accounts are connected
      await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
      await Assertions.checkIfTextIsDisplayed('Account 1');
      await Assertions.checkIfTextIsDisplayed('Solana Account 1');

      // Navigate to the permissions summary tab
      await ConnectedAccountsModal.tapManagePermissionsButton();
      await ConnectedAccountsModal.tapPermissionsSummaryTab();
      await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

      // Validate Solana Chain Permissions still exists
      await NetworkConnectMultiSelector.isNetworkChainPermissionSelected(
        NetworkNonPemittedBottomSheetSelectorsText.SOLANA_NETWORK_NAME,
      );
    });
  });

  it.skip('should default account selection to already permitted Solana account and requested Ethereum account when `wallet_requestPermissions` is called with specific Ethereum account', async () => {
    await withSolanaAccountEnabled({
      dappPath: DEFAULT_TEST_DAPP_PATH,
      solanaAccountPermitted: true,
    }, async () => {
      await TabBarComponent.tapBrowser();
      await Browser.navigateToTestDApp();

      // TODO: [ffmcgee] abstract this away ?
      // FIXME: this script ain't calling
      const myWebView = web(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID));
      const webElement = await myWebView.element(by.web.tag('body'));
      const requestPermissionsRequest = JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: { caveats: { type: 'restrictReturnedAccounts', value: [DEFAULT_FIXTURE_ACCOUNT_2] } } }],
      });

      await webElement.runScript(`(el) => {
        window.ethereum.request(${requestPermissionsRequest})
      }`);

      await TestHelpers.delay(3000);
      // Connect accounts modal
      await ConnectBottomSheet.tapConnectButton();
      await TestHelpers.delay(3000);
      // END [ffmcgee] abstract this away ?

      // Open network permissions menu
      await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
      await Assertions.checkIfVisible(ConnectedAccountsModal.title);
      await ConnectedAccountsModal.tapManagePermissionsButton();
      await ConnectedAccountsModal.tapPermissionsSummaryTab();
      await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
    });
  });

  it('should be able to request specific chains when connecting through the EVM provider with existing permissions', async () => {
    await withSolanaAccountEnabled({
      dappPath: DEFAULT_MULTICHAIN_TEST_DAPP_PATH,
      solanaAccountPermitted: true,
    }, async () => {
      await MultichainTestDApp.setupAndNavigateToTestDapp('?autoMode=true', true);

      await MultichainTestDApp.createSessionWithNetworks(
        MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM
      );

      // Wait for session creation and get the data separately
      await TestHelpers.delay(1000);
      const sessionResult = await MultichainTestDApp.getSessionData();

      const resultSolanaSessionScope = sessionResult?.sessionScopes?.[SolScope.Mainnet];
      const resultSolanaAuthorizedCaipAccount = resultSolanaSessionScope?.accounts[0] ?? '';
      await Assertions.checkIfTextMatches(resultSolanaAuthorizedCaipAccount, `${SolScope.Mainnet}:${DEFAULT_SOLANA_FIXTURE_ACCOUNT}`);

      const resultEthereumSessionScope = sessionResult?.sessionScopes?.['eip155:1'];
      const resultEthereumAuthorizedCaipAccount = resultEthereumSessionScope?.accounts[0].toLowerCase() ?? '';
      await Assertions.checkIfTextMatches(resultEthereumAuthorizedCaipAccount, `eip155:1:${DEFAULT_FIXTURE_ACCOUNT.toLowerCase()}`);
    });
  });
});
