import { test } from '../../framework/fixture';

import { loginToAppPlaywright } from '../../flows/wallet.flow';
import BrowserPlaygroundDapp from '../../page-objects/MMConnect/BrowserPlaygroundDapp';
import AndroidScreenHelpers from '../../page-objects/MMConnect/AndroidScreenHelpers';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal';
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

const DAPP_PORT = 8090;

const playgroundServer = new DappServer({
  dappCounter: 0,
  rootDirectory: TestDapps[DappVariants.BROWSER_PLAYGROUND].dappPath,
  dappVariant: DappVariants.BROWSER_PLAYGROUND,
});

test.beforeAll(async () => {
  playgroundServer.setServerPort(DAPP_PORT);
  await playgroundServer.start();
  await waitForDappServerReady(DAPP_PORT);
  setupAdbReverse(DAPP_PORT);
});

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
// 2. CONNECT VIA LEGACY EVM
//    - Tap Connect (Legacy)
//    - In MetaMask: tap Connect (cooldown 2s)
//    - Assert: connected true, chainId '0x1'
//
// 3. INCOMPLETE SESSION — NOT INTERACTING WITH MODAL
//    - Tap disconnect, then tap Connect (Legacy) again
//    - In MetaMask: open approval modal but purposely do NOT interact (sleep 2s)
//    - Switch to browser (sleep 2s), refresh mobile browser, wait 2s
//    - Assert: connected false (incomplete session started timing out)
//    - Sleep 10s to let session fully time out
//    - Assert: still connected false
//
// 4. RECONNECT AFTER SESSION TIMEOUT
//    - Tap Connect (Legacy)
//    - In MetaMask: tap Connect (cooldown 2s)
//    - Assert: connected true, chainId '0x1'
//
// 5. READ-ONLY METHOD WITH APP TERMINATED
//    - Terminate the MetaMask app (PlaywrightGestures.terminateApp)
//    - Tap getBalance in the dapp; sleep 10s for RPC response
//    - Assert: response value contains 'Balance:' prefix
//      (confirms read-only calls go directly to the RPC endpoint, not the wallet)
//
// 6. CLEANUP
//    - Tap disconnect to reset dapp state

// This test is currently being skipped as the mobile app displays a double prompt.
test.skip('@metamask/connect-evm - Incomplete session timeout and read-only methods', async ({
  currentDeviceDetails,
  driver,
}) => {
  const platform = currentDeviceDetails.platform;
  const useBrowserStackLocal =
    process.env.BROWSERSTACK_LOCAL?.toLowerCase() === 'true';
  const DAPP_URL = useBrowserStackLocal
    ? `http://bs-local.com:${DAPP_PORT}`
    : getDappUrlForBrowser(platform);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await loginToAppPlaywright();
    await ensureAccountGroupsFinishedLoading(currentDeviceDetails);
    await launchMobileBrowser();
    await navigateToDapp(DAPP_URL);
  });
  await sleep(5000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapConnectLegacy();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await unlockIfLockScreenVisible();
    await DappConnectionModal.tapConnectButton({
      shouldCooldown: true,
      timeToCooldown: 2000,
    });
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertConnected(true);
    await BrowserPlaygroundDapp.assertChainIdValue('0x1');
  }, DAPP_URL);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapDisconnect();
    await BrowserPlaygroundDapp.tapConnectLegacy();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    // Purposely not interacting with the approval but we still spend some time
    // on the app
    await sleep(2000);
  });

  await sleep(2000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await refreshMobileBrowser();
  });
  await sleep(2000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertConnected(false);
  }, DAPP_URL);

  await sleep(10000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertConnected(false);
    await BrowserPlaygroundDapp.tapConnectLegacy();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton({
      shouldCooldown: true,
      timeToCooldown: 2000,
    });
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertConnected(true);
    await BrowserPlaygroundDapp.assertChainIdValue('0x1');
  }, DAPP_URL);

  //
  // Read-only method should hit rpc endpoint instead of wallet
  //
  await PlaywrightGestures.terminateApp(currentDeviceDetails);
  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapGetBalance();
    await sleep(10000);
    // Balance response should contain "Balance:" prefix
    await BrowserPlaygroundDapp.assertResponseValue('Balance:');
  }, DAPP_URL);

  //
  // Reset dapp state
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapDisconnect();
  }, DAPP_URL);
});
