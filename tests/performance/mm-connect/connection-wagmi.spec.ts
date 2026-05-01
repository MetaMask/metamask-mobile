import { test } from '../../framework/fixture';

import { loginToAppPlaywright } from '../../flows/wallet.flow';
import BrowserPlaygroundDapp from '../../page-objects/MMConnect/BrowserPlaygroundDapp';
import AndroidScreenHelpers from '../../page-objects/MMConnect/AndroidScreenHelpers';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal';
import SignModal from '../../page-objects/MMConnect/SignModal';
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers';
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
  refreshMobileBrowser,
  switchToMobileBrowser,
} from '../../flows/native-browser.flow';

const DAPP_NAME = 'MetaMask MultiChain API Test Dapp';
const DAPP_PORT = 8090;

// NOTE: This test requires the testing SRP to be used
const ACCOUNT_1_ADDRESS = '0x19a7Ad8256ab119655f1D758348501d598fC1C94';

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
//    - In MetaMask: approve connection
//    - Assert: wagmi connected, chainId 1, active account is Account 1
//
// 3. SIGN MESSAGE ON ETHEREUM
//    - Type 'Hello MetaMask' and tap sign
//    - In MetaMask: confirm sign request on Ethereum network
//    - Assert: signature result starts with '0x'
//
// 4. REFRESH BROWSER RECONNECT
//    - Refresh mobile browser
//    - Assert: wagmi still connected, chainId 1, active account is Account 1
//    - Type 'After refresh' and tap sign; cancel in MetaMask
//
// 5. DISCONNECT AND RECONNECT
//    - Tap disconnect, assert wagmi disconnected
//    - Tap Connect (Wagmi), approve in MetaMask
//    - Assert: wagmi connected, chainId 1, active account is Account 1
//
// 6. INCOMPLETE SESSION TIMEOUT
//    - Disconnect, then tap Connect (Wagmi)
//    - In MetaMask: open approval but do NOT interact
//    - Refresh mobile browser, wait 10s for session to time out
//    - Assert: wagmi disconnected
//    - Tap Connect (Wagmi) again, approve in MetaMask
//    - Assert: wagmi connected, chainId 1, active account is Account 1
//
// 7. RESET DAPP STATE
//    - Tap disconnect to clean up

// This test is currently failing. See 250.
test.skip('@metamask/connect-evm (wagmi) - Session stability via Wagmi', async ({
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

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await unlockIfLockScreenVisible();
    await DappConnectionModal.tapConnectButton();
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  //
  // Verify connection and sign message on Ethereum
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiConnected(true);
    await BrowserPlaygroundDapp.assertWagmiChainIdValue('1');
    await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_1_ADDRESS);
    await BrowserPlaygroundDapp.typeWagmiSignMessage('Hello MetaMask');
    await PlaywrightGestures.hideKeyboard();
    await BrowserPlaygroundDapp.tapWagmiSignMessage();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Ethereum');
    await SignModal.tapConfirmButton();
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiSignatureResult('0x');
  }, DAPP_URL);

  //
  // Resume from refresh
  //

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await refreshMobileBrowser();
  });
  await sleep(2000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiConnected(true);
    // Note: Chain may reset to 1 after refresh
    await BrowserPlaygroundDapp.assertWagmiChainIdValue('1');
    await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_1_ADDRESS);
    await BrowserPlaygroundDapp.typeWagmiSignMessage('After refresh');
    await PlaywrightGestures.hideKeyboard();
    await BrowserPlaygroundDapp.tapWagmiSignMessage();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapCancelButton();
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  //
  // Terminate and connect
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapDisconnect();
    await BrowserPlaygroundDapp.assertWagmiConnected(false);
    await BrowserPlaygroundDapp.tapConnectWagmi();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton();
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiConnected(true);
    await BrowserPlaygroundDapp.assertWagmiChainIdValue('1');
    await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_1_ADDRESS);
  }, DAPP_URL);

  //
  // Wait for incomplete session timeout on refresh and reconnect after
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapDisconnect();
    await BrowserPlaygroundDapp.tapConnectWagmi();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    // Purposely not interacting with the approval
  });

  await sleep(2000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await refreshMobileBrowser();
  });
  await sleep(2000);

  // After timeout, should be disconnected
  await sleep(10000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiConnected(false);
    await BrowserPlaygroundDapp.tapConnectWagmi();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    // TODO: We're having a double connect prompt. After approving the
    // connection, a second prompt with empty accounts is shown.
    await DappConnectionModal.tapConnectButton({
      shouldCooldown: true,
      timeToCooldown: 2000,
    });
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiConnected(true);
    await BrowserPlaygroundDapp.assertWagmiChainIdValue('1');
    await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_1_ADDRESS);
  }, DAPP_URL);

  //
  // Reset dapp state
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapDisconnect();
  }, DAPP_URL);
});
