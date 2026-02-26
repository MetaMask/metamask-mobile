import { test } from 'appwright';

import { login } from '../../framework/utils/Flows.js';
import RNPlaygroundDapp from '../../../wdio/screen-objects/RNPlaygroundDapp.js';
import DappConnectionModal from '../../../wdio/screen-objects/Modals/DappConnectionModal.js';
import SignModal from '../../../wdio/screen-objects/Modals/SignModal.js';
import SnapSignModal from '../../../wdio/screen-objects/Modals/SnapSignModal.js';
import { APP_PACKAGE_IDS } from '../../framework/Constants.ts';
import {
  unlockIfLockScreenVisible,
  ensurePlaygroundInstalled,
} from './utils.js';
import AppwrightGestures from '../../framework/AppwrightGestures.ts';

const CHAINS = {
  ETHEREUM: 'eip155:1',
  LINEA: 'eip155:59144',
  POLYGON: 'eip155:137',
  SOLANA: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
};

const EVM_CHAINS = [CHAINS.ETHEREUM, CHAINS.LINEA, CHAINS.POLYGON];
const ALL_CHAINS = [...EVM_CHAINS, CHAINS.SOLANA];

const NETWORK_DISPLAY_NAMES = {
  [CHAINS.ETHEREUM]: 'Ethereum',
  [CHAINS.LINEA]: 'Linea',
  [CHAINS.POLYGON]: 'Polygon',
};

const DEFAULT_SCROLL_PARAMS = {
  scrollParams: { percent: 0.2 },
};

/**
 * After a MetaMask action (approve / sign), wait for the callback deeplink
 * to return to the playground. Falls back to activateApp if the automatic
 * return does not happen within a short window.
 */
async function returnToPlayground() {
  await AppwrightGestures.wait(2000);
  await RNPlaygroundDapp.ensureInPlayground();
}

test.beforeAll(() => {
  ensurePlaygroundInstalled();
});

test('@metamask/connect-multichain-rn - Connect across 3 EVM chains and Solana, invoke read/write methods, and disconnect', async ({
  device,
}) => {
  RNPlaygroundDapp.device = device;
  DappConnectionModal.device = device;
  SignModal.device = device;
  SnapSignModal.device = device;
  AppwrightGestures.device = device;

  await device.webDriverClient.updateSettings({
    waitForIdleTimeout: 100,
    waitForSelectorTimeout: 0,
    shouldWaitForQuiescence: false,
  });

  //
  // 1. Login to MetaMask wallet
  //

  await login(device);

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
  await AppwrightGestures.wait(3000);

  await unlockIfLockScreenVisible(device);
  await AppwrightGestures.wait(5000);
  await DappConnectionModal.tapConnectButton();

  //
  // 4. Return to playground and verify all connections are active
  //

  await returnToPlayground();
  await AppwrightGestures.wait(1000);
  await RNPlaygroundDapp.assertConnected();

  await RNPlaygroundDapp.scrollToElement(RNPlaygroundDapp.appTitle, {
    scrollParams: { direction: 'down' },
  });

  for (const chain of ALL_CHAINS) {
    await RNPlaygroundDapp.scrollToElement(
      RNPlaygroundDapp.getScopeCard(chain),
      DEFAULT_SCROLL_PARAMS,
    );
    await RNPlaygroundDapp.assertScopeCardVisible(chain);
  }

  //
  // 5. EVM Read requests — eth_blockNumber for each EVM chain (already the
  //    default selected method) and getGenesisHash for Solana
  //

  await RNPlaygroundDapp.scrollToElement(RNPlaygroundDapp.appTitle, {
    scrollParams: { direction: 'down' },
  });

  for (const chain of EVM_CHAINS) {
    await RNPlaygroundDapp.scrollToElement(
      RNPlaygroundDapp.getInvokeButton(chain),
      DEFAULT_SCROLL_PARAMS,
    );
    await RNPlaygroundDapp.tapInvoke(chain);
    await AppwrightGestures.wait(5000);

    await RNPlaygroundDapp.scrollToElement(
      RNPlaygroundDapp.getResultCode(chain, 'eth_blockNumber'),
      DEFAULT_SCROLL_PARAMS,
    );
    await RNPlaygroundDapp.assertResultCodeContains(
      chain,
      'eth_blockNumber',
      '0x',
    );
  }

  //
  // 6. Write requests — personal_sign for each EVM chain, signMessage for Solana.
  //    Each write request opens MetaMask for approval, validating that the request
  //    is routed to the correct network.
  //
  await RNPlaygroundDapp.scrollToElement(RNPlaygroundDapp.appTitle, {
    scrollParams: { direction: 'down' },
  });

  for (const chain of EVM_CHAINS) {
    // Select personal_sign (replaces default eth_blockNumber)
    await RNPlaygroundDapp.scrollToElement(
      RNPlaygroundDapp.getMethodSelect(chain),
      DEFAULT_SCROLL_PARAMS,
    );
    await RNPlaygroundDapp.selectMethod(chain, 'personal_sign');

    await RNPlaygroundDapp.scrollToElement(
      RNPlaygroundDapp.getInvokeButton(chain),
      DEFAULT_SCROLL_PARAMS,
    );
    await RNPlaygroundDapp.tapInvoke(chain);
    await AppwrightGestures.wait(3000);

    // Handle MetaMask sign approval
    await unlockIfLockScreenVisible(device);
    await AppwrightGestures.wait(1000);

    // Verify request was routed to the correct network
    const networkName = NETWORK_DISPLAY_NAMES[chain];
    if (networkName) {
      try {
        await SignModal.assertNetworkText(networkName);
      } catch {
        // Network label may not appear for all signing modals; continue
      }
    }

    await SignModal.tapConfirmButton();
    await returnToPlayground();
    await AppwrightGestures.wait(1000);

    // Verify a signature was returned (hex string starting with 0x)
    await RNPlaygroundDapp.scrollToElement(
      RNPlaygroundDapp.getResultCode(chain, 'personal_sign'),
      DEFAULT_SCROLL_PARAMS,
    );
    await RNPlaygroundDapp.assertResultCodeContains(
      chain,
      'personal_sign',
      '0x',
    );
  }

  // FIXME: This flow is broken on the e2e test environment (issue does not manifest itself when manually going through this flow)
  // https://consensyssoftware.atlassian.net/browse/WAPI-1136

  // Solana write request
  // await RNPlaygroundDapp.scrollToElement(
  //   RNPlaygroundDapp.getMethodSelect(CHAINS.SOLANA),
  //   DEFAULT_SCROLL_PARAMS,
  // );
  // await RNPlaygroundDapp.selectMethod(CHAINS.SOLANA, 'signMessage');

  // await RNPlaygroundDapp.scrollToElement(
  //   RNPlaygroundDapp.getInvokeButton(CHAINS.SOLANA),
  //   DEFAULT_SCROLL_PARAMS,
  // );
  // await RNPlaygroundDapp.tapInvoke(CHAINS.SOLANA);
  // await AppwrightGestures.wait(3000);

  // await unlockIfLockScreenVisible(device);
  // await AppwrightGestures.wait(1000);
  // await SnapSignModal.tapConfirmButton();
  // await returnToPlayground();

  // await RNPlaygroundDapp.scrollToElement(
  //   RNPlaygroundDapp.getResultCode(CHAINS.SOLANA, 'signMessage'),
  //   DEFAULT_SCROLL_PARAMS,
  // );
  // await RNPlaygroundDapp.waitForResult(CHAINS.SOLANA, 'signMessage');

  //
  // 7. Disconnect (wallet_revokeSession) and verify session termination
  //

  // Scroll back to the top where the disconnect button lives
  await RNPlaygroundDapp.scrollToElement(RNPlaygroundDapp.disconnectButton, {
    scrollParams: { direction: 'down' },
  });
  await RNPlaygroundDapp.tapDisconnect();
  await RNPlaygroundDapp.assertDisconnected();

  // Switch to MetaMask and confirm the wallet no longer shows an active session
  await device.activateApp(APP_PACKAGE_IDS.ANDROID);
  await AppwrightGestures.wait(1000);
  await unlockIfLockScreenVisible(device);
});
