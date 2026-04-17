import { test } from '../../framework/fixture';

import { loginToAppPlaywright } from '../../flows/wallet.flow';
import RNPlaygroundDapp from '../../page-objects/MMConnect/RNPlaygroundDapp';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal';
import SnapSignModal from '../../page-objects/MMConnect/SnapSignModal';
import {
  unlockIfLockScreenVisible,
  ensurePlaygroundInstalled,
  ensureAccountGroupsFinishedLoading,
} from './utils';
import {
  PlaywrightGestures,
  PlaywrightAssertions,
  sleep,
  asPlaywrightElement,
} from '../../framework';
import WalletView from '../../page-objects/wallet/WalletView';

const CHAINS = {
  ETHEREUM: 'eip155:1',
  LINEA: 'eip155:59144',
  POLYGON: 'eip155:137',
  SOLANA: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
};

/**
 * After a MetaMask action (approve / sign), wait for the callback deeplink
 * to return to the playground. Falls back to activateApp if the automatic
 * return does not happen within a short window.
 */
async function returnToPlayground() {
  await RNPlaygroundDapp.ensureInPlayground();
  await sleep(2000);
}

// Test steps (in order):
//
// 1. SETUP
//    - Skip if running on BrowserStack and BROWSERSTACK_RN_PLAYGROUND_URL is not set
//    - If running locally: call ensurePlaygroundInstalled to adb-install the APK
//
// 2. LOGIN AND NAVIGATE TO PLAYGROUND
//    - Login to MetaMask wallet, wait for wallet container to be visible
//    - Ensure account groups (including Solana) have finished loading
//    - Switch to RN playground app and wait for it to be ready
//
// 3. SELECT NETWORKS AND CONNECT
//    - Ethereum is pre-selected; tap checkboxes to add Linea, Polygon, and Solana
//    - Tap Connect → unlock if lock screen visible → tap Connect button (cooldown 3s)
//
// 4. VERIFY SOLANA CONNECTION ACTIVE
//    - Return to playground (via deeplink callback or activateApp fallback)
//    - Assert connected state is true
//    - Assert scope card is visible for:
//      solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp (Solana)
//
// 5. SOLANA WRITE REQUEST (signMessage)
//    - Select signMessage for the Solana scope, tap Invoke
//    - In MetaMask: unlock if needed, tap SnapSignModal Confirm
//    - Return to playground; wait for result to appear
//
// 6. DISCONNECT
//    - Scroll to disconnect button, tap Disconnect
//    - Assert session is disconnected
//    - Switch to MetaMask and unlock if needed to confirm no active session

test('@metamask/connect-multichain-rn-solana - Connect with Solana, invoke signMessage, and disconnect', async ({
  currentDeviceDetails,
  driver,
}) => {
  // When running on BrowserStack we skip the test if the RN playground is not installed
  test.skip(
    currentDeviceDetails.isBrowserstack &&
      !process.env.BROWSERSTACK_RN_PLAYGROUND_URL,
    'Skipped: BROWSERSTACK_RN_PLAYGROUND_URL is not set',
  );

  // handle local installs of the RN playground
  if (!currentDeviceDetails.isBrowserstack) {
    ensurePlaygroundInstalled(currentDeviceDetails);
  }

  //
  // 1. Login to MetaMask wallet
  //
  await loginToAppPlaywright();
  await PlaywrightAssertions.expectElementToBeVisible(
    await asPlaywrightElement(WalletView.container),
    { timeout: 15000 },
  );

  await ensureAccountGroupsFinishedLoading(currentDeviceDetails);

  //
  // 2. Switch to the RN playground and select networks
  //
  await RNPlaygroundDapp.switchToPlayground();
  await RNPlaygroundDapp.waitForPlaygroundReady();

  // Ethereum (eip155:1) is selected by default; add three more networks
  await RNPlaygroundDapp.tapNetworkCheckbox(CHAINS.LINEA);
  await RNPlaygroundDapp.tapNetworkCheckbox(CHAINS.POLYGON);
  await RNPlaygroundDapp.tapNetworkCheckbox(CHAINS.SOLANA);

  //
  // 3. Connect via Multichain API
  //
  await RNPlaygroundDapp.tapConnect();
  await sleep(3000);

  await unlockIfLockScreenVisible();
  await sleep(5000);
  await DappConnectionModal.tapConnectButton({
    shouldCooldown: true,
    timeToCooldown: 3000,
  });

  //
  // 4. Return to playground and verify Solana connection is active
  //
  await returnToPlayground();

  await RNPlaygroundDapp.assertConnected();

  await RNPlaygroundDapp.scrollToElement(RNPlaygroundDapp.appTitle, {
    scrollParams: { direction: 'down' },
    percent: 0.5,
  });

  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.getScopeCard(CHAINS.SOLANA),
    {
      percent: 0.5,
    },
  );
  await RNPlaygroundDapp.assertScopeCardVisible(CHAINS.SOLANA);

  //
  // 5. Solana write request — signMessage
  //
  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.getMethodSelect(CHAINS.SOLANA),
    {
      percent: 0.5,
    },
  );
  await RNPlaygroundDapp.selectMethod(CHAINS.SOLANA, 'signMessage');

  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.getInvokeButton(CHAINS.SOLANA),
    {
      percent: 0.5,
    },
  );
  await RNPlaygroundDapp.tapInvoke(CHAINS.SOLANA);
  await sleep(3000);

  await unlockIfLockScreenVisible();
  await sleep(1000);
  await SnapSignModal.tapConfirmButton({
    shouldCooldown: true,
    timeToCooldown: 3000,
  });
  await returnToPlayground();

  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.getResultCode(CHAINS.SOLANA, 'signMessage'),
    {
      percent: 0.5,
    },
  );
  await RNPlaygroundDapp.waitForResult(CHAINS.SOLANA, 'signMessage');

  //
  // 6. Disconnect (wallet_revokeSession) and verify session termination
  //

  // Scroll back to the top where the disconnect button lives
  await RNPlaygroundDapp.scrollToElement(RNPlaygroundDapp.disconnectButton, {
    scrollParams: { direction: 'down' },
    percent: 0.5,
  });
  await RNPlaygroundDapp.tapDisconnect();
  await RNPlaygroundDapp.assertDisconnected();
});
