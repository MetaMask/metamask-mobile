import { test } from '../../framework/fixture';

import { loginToAppPlaywright } from '../../flows/wallet.flow';
import BrowserPlaygroundDapp from '../../page-objects/MMConnect/BrowserPlaygroundDapp';
import AndroidScreenHelpers from '../../page-objects/MMConnect/AndroidScreenHelpers';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal';
import SignModal from '../../page-objects/MMConnect/SignModal';
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers';
import { DappServer, DappVariants, TestDapps, sleep } from '../../framework';
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

const DAPP_PORT = 8090;

// NOTE: This test requires the testing SRP to be used
const ACCOUNT_1_ADDRESS = '0x19a7Ad8256ab119655f1D758348501d598fC1C94';

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
//    - Assert: connected true, chainId '0x1', active account is Account 1
//      (0x19a7Ad8256ab119655f1D758348501d598fC1C94)
//
// 3. INITIAL REJECTION
//    - Tap personal sign
//    - In MetaMask: tap Cancel (cooldown 2s)
//    - Assert: response value 'rejected'
//
// 4. DISCONNECT AND RECONNECT — FIRST CYCLE
//    - Disconnect, assert connected false, tap Connect (Legacy)
//    - In MetaMask: tap Connect (cooldown 2s)
//    - Assert: connected true, chainId '0x1', active account is Account 1
//    - Tap personal sign; tap Cancel in MetaMask (cooldown 2s)
//    - Assert: response value 'rejected'
//
// 5. DISCONNECT AND RECONNECT — SECOND CYCLE
//    - Disconnect (no connected false assertion), tap Connect (Legacy)
//    - In MetaMask: tap Connect (cooldown 2s)
//    - Assert: connected true, chainId '0x1', active account is Account 1
//    - Tap personal sign; tap Cancel in MetaMask (cooldown 2s)
//    - Assert: response value 'rejected'
//
// 6. CLEANUP
//    - Tap disconnect to reset dapp state

test('@metamask/connect-evm - Rejection response value verification', async ({
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
    await BrowserPlaygroundDapp.assertActiveAccount(ACCOUNT_1_ADDRESS);
    await BrowserPlaygroundDapp.tapPersonalSign();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapCancelButton({
      shouldCooldown: true,
      timeToCooldown: 2000,
    });
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertResponseValue('rejected');
  }, DAPP_URL);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapDisconnect();
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
    await BrowserPlaygroundDapp.assertActiveAccount(ACCOUNT_1_ADDRESS);
    await BrowserPlaygroundDapp.tapPersonalSign();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapCancelButton({
      shouldCooldown: true,
      timeToCooldown: 2000,
    });
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertResponseValue('rejected');
  }, DAPP_URL);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapDisconnect();
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
    await BrowserPlaygroundDapp.assertActiveAccount(ACCOUNT_1_ADDRESS);
    await BrowserPlaygroundDapp.tapPersonalSign();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapCancelButton({
      shouldCooldown: true,
      timeToCooldown: 2000,
    });
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertResponseValue('rejected');
  }, DAPP_URL);

  //
  // Reset dapp state
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapDisconnect();
  }, DAPP_URL);
});
