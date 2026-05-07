import { test } from '../../framework/fixture';

import { loginToAppPlaywright } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import BrowserPlaygroundDapp from '../../page-objects/MMConnect/BrowserPlaygroundDapp';
import AndroidScreenHelpers from '../../page-objects/MMConnect/AndroidScreenHelpers';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal';
import SignModal from '../../page-objects/MMConnect/SignModal';
import SwitchChainModal from '../../page-objects/MMConnect/SwitchChainModal';
import AddChainModal from '../../page-objects/MMConnect/AddChainModal';
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import {
  DappServer,
  DappVariants,
  PlaywrightGestures,
  TestDapps,
  sleep,
} from '../../framework';
import {
  getDappUrlForBrowser,
  setupAdbReverse,
  cleanupAdbReverse,
  waitForDappServerReady,
  unlockIfLockScreenVisible,
  ensureAccountGroupsFinishedLoading,
} from './utils';
import {
  launchMobileBrowser,
  navigateToDapp,
  switchToMobileBrowser,
} from '../../flows/native-browser.flow';

const DAPP_NAME = 'MetaMask MultiChain API Test Dapp';
const DAPP_PORT = 8090;

// NOTE: This test requires the testing SRP to be used
const ACCOUNT_1_ADDRESS = '0x19a7Ad8256ab119655f1D758348501d598fC1C94';
const ACCOUNT_3_ADDRESS = '0xE2bEca5CaDC60b61368987728b4229822e6CDa83';

// Create the playground server using the shared framework
const playgroundServer = new DappServer({
  dappCounter: 0,
  rootDirectory: TestDapps[DappVariants.BROWSER_PLAYGROUND].dappPath,
  dappVariant: DappVariants.BROWSER_PLAYGROUND,
});

// Start local playground server before all tests
test.beforeAll(async () => {
  playgroundServer.setServerPort(DAPP_PORT);
  await playgroundServer.start();
  await waitForDappServerReady(DAPP_PORT);
  setupAdbReverse(DAPP_PORT);
});

// Stop local playground server after all tests
test.afterAll(async () => {
  cleanupAdbReverse(DAPP_PORT);
  await playgroundServer.stop();
});

// Test steps (in order):
//
// 1. LOGIN AND NAVIGATE TO DAPP
//    - Login to app, ensure account groups finished loading
//    - Launch mobile browser and navigate to the playground dapp
//
// 2. CONNECT VIA WAGMI
//    - Tap Connect (Wagmi)
//    - In MetaMask: add Account 3, unselect OP Mainnet from networks, tap Connect
//    - Assert: wagmi connected, chainId 1, active account is Account 1
//
// 3. SWITCH TO SEPOLIA AND SIGN
//    - Switch chain to Sepolia (11155111), assert chainId 11155111
//    - Type 'Hello Sepolia' and tap sign
//    - In MetaMask: cancel sign request on Sepolia network
//
// 4. SWITCH TO OP MAINNET (requires approval) AND CHANGE ACCOUNT
//    - Tap switch chain to OP Mainnet (10)
//    - In MetaMask: approve chain switch modal showing 'OP'
//    - Assert: chainId 10
//    - Type 'Hello OP' and tap sign; cancel in MetaMask
//    - In MetaMask: navigate to account list and select Account 3
//
// 5. VERIFY ACCOUNT CHANGE AND ADD CELO CHAIN
//    - Assert: wagmi active account is now Account 3
//    - Tap switch chain to Celo (42220) — triggers add chain flow
//    - In MetaMask: assert chain shows '42220' and 'Celo', confirm add chain
//    - Assert: chainId 42220
//    - Type 'Hello Celo' and tap sign; cancel in MetaMask
//
// 6. CLEANUP
//    - Tap disconnect to clean up
test('@metamask/connect-evm (wagmi) - Chain switching via Wagmi', async ({
  currentDeviceDetails,
  driver,
}) => {
  const platform = currentDeviceDetails.platform;
  const useBrowserStackLocal =
    process.env.BROWSERSTACK_LOCAL?.toLowerCase() === 'true';
  const DAPP_URL = useBrowserStackLocal
    ? `http://bs-local.com:${DAPP_PORT}`
    : getDappUrlForBrowser(platform);

  //
  // Login and navigate to dapp
  //
  await PlaywrightContextHelpers.withNativeAction(async () => {
    await loginToAppPlaywright();
    await ensureAccountGroupsFinishedLoading(currentDeviceDetails);
    await launchMobileBrowser();
    await navigateToDapp(DAPP_URL);
  });

  await sleep(5000);

  //
  // Connect via WAGMI
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapConnectWagmi();
  }, DAPP_URL);

  // Handle connection approval in MetaMask
  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await unlockIfLockScreenVisible();
    await DappConnectionModal.tapEditAccountsButton();
    // Select account 3 in addition to Account 1
    await DappConnectionModal.tapAccountButton('Account 3');
    await DappConnectionModal.tapUpdateAccountsButton();
    await DappConnectionModal.tapPermissionsTabButton();
    // Unselect OP Mainnet
    await DappConnectionModal.tapEditNetworksButton();
    await DappConnectionModal.tapNetworkButton('OP');
    await DappConnectionModal.tapUpdateNetworksButton();
    await DappConnectionModal.tapConnectButton({
      shouldCooldown: true,
      timeToCooldown: 2000,
    });
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  //
  // Verify connection and switch to Sepolia
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiConnected(true);
    await BrowserPlaygroundDapp.assertWagmiChainIdValue('1');
    await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_1_ADDRESS);
    // Switch to Sepolia
    await BrowserPlaygroundDapp.tapWagmiSwitchChain(11155111);
    await BrowserPlaygroundDapp.assertWagmiChainIdValue('11155111');
    // Sign a message on Sepolia
    await BrowserPlaygroundDapp.typeWagmiSignMessage('Hello Sepolia');
    await PlaywrightGestures.hideKeyboard();
    await BrowserPlaygroundDapp.tapWagmiSignMessage({
      shouldCooldown: true,
      timeToCooldown: 2000,
    });
  }, DAPP_URL);

  // Cancel sign request
  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Sepolia');
    await SignModal.tapCancelButton();
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  //
  // Switch to OP Mainnet (requires approval since unselected earlier)
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapWagmiSwitchChain(10); // OP Mainnet
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SwitchChainModal.assertNetworkText('OP');
    await SwitchChainModal.tapConnectButton({
      shouldCooldown: true,
      timeToCooldown: 2000,
    });
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiChainIdValue('10');
    await BrowserPlaygroundDapp.typeWagmiSignMessage('Hello OP');
    await PlaywrightGestures.hideKeyboard();
    await BrowserPlaygroundDapp.tapWagmiSignMessage();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('OP');
    await SignModal.tapCancelButton();

    // Wait here to make sure UI is visible before attempted interaction
    await sleep(1000);

    // Change selected account to Account 3 in MetaMask
    await WalletView.tapIdenticon();
    await AccountListBottomSheet.tapAccountByName('Account 3');
    // Forcefully waiting for accounts to be synced
    await sleep(2500);
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  //
  // Verify account change and add CELO chain
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_3_ADDRESS);
    // Try to switch to Celo (will trigger add chain)
    await BrowserPlaygroundDapp.tapWagmiSwitchChain(42220);
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await AddChainModal.assertText('42220');
    await AddChainModal.assertText('Celo');
    await AddChainModal.tapConfirmButton({
      shouldCooldown: true,
      timeToCooldown: 2000,
    });
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiChainIdValue('42220');
    await BrowserPlaygroundDapp.typeWagmiSignMessage('Hello Celo');
    await PlaywrightGestures.hideKeyboard();
    await BrowserPlaygroundDapp.tapWagmiSignMessage({
      shouldCooldown: true,
      timeToCooldown: 2000,
    });
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Celo');
    await SignModal.tapCancelButton({
      shouldCooldown: true,
      timeToCooldown: 2000,
    });
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  //
  // Reset dapp state
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapDisconnect();
  }, DAPP_URL);
});
