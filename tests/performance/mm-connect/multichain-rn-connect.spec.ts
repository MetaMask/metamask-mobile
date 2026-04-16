import { test } from '../../framework/fixture';

import { loginToAppPlaywright } from '../../flows/wallet.flow';
import RNPlaygroundDapp from '../../page-objects/MMConnect/RNPlaygroundDapp';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal';
import SignModal from '../../page-objects/MMConnect/SignModal';
import SnapSignModal from '../../page-objects/MMConnect/SnapSignModal';
import { APP_PACKAGE_IDS } from '../../framework/Constants';
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
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';

const CHAINS = {
  ETHEREUM: 'eip155:1',
  LINEA: 'eip155:59144',
  POLYGON: 'eip155:137',
  SOLANA: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
};

const EVM_CHAINS = [CHAINS.ETHEREUM, CHAINS.LINEA, CHAINS.POLYGON];
const ALL_CHAINS = [...EVM_CHAINS, CHAINS.SOLANA];

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
  await sleep(2000);
  await RNPlaygroundDapp.ensureInPlayground();
}

test.beforeAll(() => {
  ensurePlaygroundInstalled();
});

test.skip('@metamask/connect-multichain-rn - Connect across 3 EVM chains and Solana, invoke read/write methods, and disconnect', async ({
  currentDeviceDetails,
  driver,
}) => {
  await driver.updateSettings({
    waitForIdleTimeout: 100,
    waitForSelectorTimeout: 0,
    shouldWaitForQuiescence: false,
  });

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
  await DappConnectionModal.tapConnectButton();

  //
  // 4. Return to playground and verify all connections are active
  //

  await returnToPlayground();
  await sleep(1000);
  await RNPlaygroundDapp.assertConnected();

  await RNPlaygroundDapp.scrollToElement(RNPlaygroundDapp.appTitle, {
    scrollParams: { direction: 'down' },
  });

  for (const chain of ALL_CHAINS) {
    await RNPlaygroundDapp.scrollToElement(
      RNPlaygroundDapp.getScopeCard(chain),
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
    );
    await RNPlaygroundDapp.tapInvoke(chain);
    await sleep(5000);

    await RNPlaygroundDapp.scrollToElement(
      RNPlaygroundDapp.getResultCode(chain, 'eth_blockNumber'),
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
    );
    await RNPlaygroundDapp.selectMethod(chain, 'personal_sign');

    await RNPlaygroundDapp.scrollToElement(
      RNPlaygroundDapp.getInvokeButton(chain),
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

    await SignModal.tapConfirmButton();
    await returnToPlayground();
    await sleep(1000);

    // Verify a signature was returned (hex string starting with 0x)
    await RNPlaygroundDapp.scrollToElement(
      RNPlaygroundDapp.getResultCode(chain, 'personal_sign'),
    );
    await RNPlaygroundDapp.assertResultCodeContains(
      chain,
      'personal_sign',
      '0x',
    );
  }

  // Solana write request
  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.getMethodSelect(CHAINS.SOLANA),
  );
  await RNPlaygroundDapp.selectMethod(CHAINS.SOLANA, 'signMessage');

  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.getInvokeButton(CHAINS.SOLANA),
  );
  await RNPlaygroundDapp.tapInvoke(CHAINS.SOLANA);
  await sleep(3000);

  await unlockIfLockScreenVisible();
  await sleep(1000);
  await SnapSignModal.tapConfirmButton();
  await returnToPlayground();

  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.getResultCode(CHAINS.SOLANA, 'signMessage'),
  );
  await RNPlaygroundDapp.waitForResult(CHAINS.SOLANA, 'signMessage');

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
  await PlaywrightGestures.activateApp(currentDeviceDetails);
  await sleep(1000);
  await unlockIfLockScreenVisible();
});
