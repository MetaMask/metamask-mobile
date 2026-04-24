import { test } from '../../framework/fixture';

import { loginToAppPlaywright } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import BrowserPlaygroundDapp from '../../page-objects/MMConnect/BrowserPlaygroundDapp';
import AndroidScreenHelpers from '../../page-objects/MMConnect/AndroidScreenHelpers';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal';
import SignModal from '../../page-objects/MMConnect/SignModal';
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
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
  refreshMobileBrowser,
  switchToMobileBrowser,
} from '../../flows/native-browser.flow';
import PlaywrightUtilities from '../../framework/PlaywrightUtilities';
import { APP_PACKAGE_IDS } from '../../framework/Constants';

const DAPP_PORT = 8090;

// NOTE: This test requires the testing SRP to be used
const ACCOUNT_1_ADDRESS = '0x19a7Ad8256ab119655f1D758348501d598fC1C94';
const ACCOUNT_3_ADDRESS = '0xE2bEca5CaDC60b61368987728b4229822e6CDa83';

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
// 2. CONNECT VIA LEGACY EVM (WITH ACCOUNT 3 ADDED)
//    - Tap Connect (Legacy)
//    - In MetaMask: tap Edit Accounts, add Account 3, tap Update, tap Connect (cooldown 2s)
//      Account 3 must be authorized so MetaMask can switch to it later
//    - Assert: connected true, chainId '0x1', active account is Account 1
//      (0x19a7Ad8256ab119655f1D758348501d598fC1C94)
//
// 3. SWITCH TO ACCOUNT 3 IN METAMASK
//    - In MetaMask: tap identicon → select Account 3 from the account list
//    - Assert: dapp reflects Account 3 as the active account
//      (0xE2bEca5CaDC60b61368987728b4229822e6CDa83)
//
// 4. REFRESH BROWSER AND VERIFY ACCOUNT PERSISTS
//    - Refresh mobile browser (native action)
//    - Assert: connected true, chainId '0x1', active account is still Account 3
//      (0xE2bEca5CaDC60b61368987728b4229822e6CDa83)
//
// 5. PERSONAL SIGN TO VERIFY WALLET-SIDE ACCOUNT
//    - Tap personal sign
//    - In MetaMask: tap Cancel (cooldown 2s)
//      Canceling verifies Account 3 appears as the signer in the modal (wallet-side check)
//    - Assert: response value 'rejected'
//
// 6. CLEANUP
//    - Tap disconnect to reset dapp state

test('@metamask/connect-evm - Account switching and wallet-side verification', async ({
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
    await DappConnectionModal.tapEditAccountsButton();
    await DappConnectionModal.tapAccountButton('Account 3');
    await DappConnectionModal.tapUpdateAccountsButton();
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
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    // Wait here to make sure UI is visible before attempted interaction
    await sleep(1000);
    // We're only using Android for now
    await PlaywrightUtilities.launchApp({
      packageName: APP_PACKAGE_IDS.ANDROID,
    });
    await unlockIfLockScreenVisible();

    // Change selected account to Account 3 in MetaMask
    await WalletView.tapIdenticon();
    await AccountListBottomSheet.tapAccountByName('Account 3');
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    // Verify account changed to Account 3
    await BrowserPlaygroundDapp.assertActiveAccount(ACCOUNT_3_ADDRESS);
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await refreshMobileBrowser();
  });
  await sleep(2000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertConnected(true);
    await BrowserPlaygroundDapp.assertChainIdValue('0x1');
    await BrowserPlaygroundDapp.assertActiveAccount(ACCOUNT_3_ADDRESS);
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
