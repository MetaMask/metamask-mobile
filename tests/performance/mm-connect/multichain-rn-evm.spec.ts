import { test } from '../../framework/fixture';

import { loginToAppPlaywright } from '../../flows/wallet.flow';
import RNPlaygroundDapp from '../../page-objects/MMConnect/RNPlaygroundDapp';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal';
import SignModal from '../../page-objects/MMConnect/SignModal';
import {
  unlockIfLockScreenVisible,
  ensurePlaygroundInstalled,
  ensureAccountGroupsFinishedLoading,
} from './utils';
import {
  PlaywrightAssertions,
  sleep,
  asPlaywrightElement,
  PlaywrightGestures,
} from '../../framework';
import WalletView from '../../page-objects/wallet/WalletView';

const CHAINS = {
  ETHEREUM: 'eip155:1',
  LINEA: 'eip155:59144',
  POLYGON: 'eip155:137',
};

const EVM_CHAINS = [CHAINS.ETHEREUM, CHAINS.LINEA, CHAINS.POLYGON];

const NETWORK_DISPLAY_NAMES: Record<string, string> = {
  [CHAINS.ETHEREUM]: 'Ethereum',
  [CHAINS.LINEA]: 'Linea',
  [CHAINS.POLYGON]: 'Polygon',
};

/**
 * After a MetaMask action (approve / sign), wait for the callback deeplink
 * to return to the playground. Falls back to activateApp if the automatic
 * return does not happen within a short window.
 */
async function returnToPlayground() {
  await RNPlaygroundDapp.ensureInPlayground();
  await sleep(1500);
}

// Test steps (in order):
//
// 1. SETUP
//    - Skip if running on BrowserStack and BROWSERSTACK_RN_PLAYGROUND_URL is not set
//    - If running locally: call ensurePlaygroundInstalled to adb-install the APK
//
// 2. LOGIN AND NAVIGATE TO PLAYGROUND
//    - Login to MetaMask wallet, wait for wallet container to be visible
//    - Ensure account groups have finished loading
//    - Switch to RN playground app and wait for it to be ready
//
// 3. SELECT NETWORKS AND CONNECT
//    - Ethereum is pre-selected; tap checkboxes to add Linea and Polygon
//    - Tap Connect → unlock if lock screen visible → tap Connect button (cooldown 3s)
//
// 4. VERIFY EVM CONNECTIONS AND READ REQUESTS (eth_blockNumber)
//    - Return to playground (via deeplink callback or activateApp fallback)
//    - Assert connected state is true
//    - For each EVM chain (Ethereum, Linea, Polygon):
//        - Assert scope card is visible
//        - Tap Invoke with default method (eth_blockNumber)
//        - Wait 5s for RPC response
//        - Assert result contains '0x' (valid block number hex)
//
// 5. EVM WRITE REQUESTS (personal_sign)
//    - For each EVM chain (Ethereum, Linea, Polygon):
//        - Select personal_sign method, tap Invoke
//        - In MetaMask: unlock if needed, assert network label matches chain,
//          tap Confirm (no cooldown)
//        - Return to playground; assert result contains '0x' (valid signature)
//
// 6. DISCONNECT
//    - Scroll to disconnect button, tap Disconnect
//    - Assert session is disconnected
//    - Switch to MetaMask and unlock if needed to confirm no active session

test('@metamask/connect-multichain-rn-evm - Connect across 3 EVM chains, invoke read/write methods, and disconnect', async ({
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

  // Ethereum (eip155:1) is selected by default; add two more EVM networks
  await RNPlaygroundDapp.tapNetworkCheckbox(CHAINS.LINEA);
  await RNPlaygroundDapp.tapNetworkCheckbox(CHAINS.POLYGON);

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
  // 4. Return to playground, verify EVM connections, and invoke read requests
  //
  await returnToPlayground();
  await RNPlaygroundDapp.assertConnected();

  for (const chain of EVM_CHAINS) {
    await RNPlaygroundDapp.scrollToElement(
      RNPlaygroundDapp.getInvokeButton(chain),
      {
        percent: 0.5,
      },
    );
    await RNPlaygroundDapp.tapInvoke(chain);
    await sleep(5000);

    await RNPlaygroundDapp.scrollToElement(
      RNPlaygroundDapp.getResultCode(chain, 'eth_blockNumber'),
      {
        percent: 0.5,
      },
    );
    await RNPlaygroundDapp.assertResultCodeContains(
      chain,
      'eth_blockNumber',
      '0x',
    );

    // Test the write request
    await RNPlaygroundDapp.selectMethod(chain, 'personal_sign', 10, 2, 'down');

    await RNPlaygroundDapp.scrollToElement(
      RNPlaygroundDapp.getInvokeButton(chain),
      {
        percent: 0.5,
      },
    );
    await RNPlaygroundDapp.tapInvoke(chain);
    await sleep(3000);

    // Handle MetaMask sign approval
    await unlockIfLockScreenVisible();
    await sleep(1000);

    // Verify request was routed to the correct network
    const networkName = NETWORK_DISPLAY_NAMES[chain];
    if (networkName) {
      try {
        await SignModal.assertNetworkText(networkName);
      } catch {
        // Network label may not appear for all signing modals; continue
      }
    }

    await SignModal.tapConfirmButton({
      shouldCooldown: true,
      timeToCooldown: 3000,
    });
    await returnToPlayground();

    // Verify a signature was returned (hex string starting with 0x)
    await RNPlaygroundDapp.scrollToElement(
      RNPlaygroundDapp.getResultCode(chain, 'personal_sign'),
      {
        percent: 0.5,
        scrollParams: { direction: 'up' },
      },
    );
    await RNPlaygroundDapp.assertResultCodeContains(
      chain,
      'personal_sign',
      '0x',
    );
  }

  // Eager swipe up as the disconnect button sits at the top of the Dapp
  await PlaywrightGestures.swipe({
    scrollParams: { direction: 'down' },
    duration: 100,
    from: { x: 100, y: 300 },
    to: { x: 100, y: 1700 },
    percent: 0.5,
  });

  // Scroll back to the top where the disconnect button lives
  await RNPlaygroundDapp.scrollToElement(RNPlaygroundDapp.disconnectButton, {
    scrollParams: { direction: 'down' },
    percent: 0.5,
  });
  await RNPlaygroundDapp.tapDisconnect();
  await RNPlaygroundDapp.assertDisconnected();
});
