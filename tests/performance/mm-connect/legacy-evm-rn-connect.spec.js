import { test, expect } from '../../framework/fixtures/performance';

import { login } from '../../framework/utils/Flows.js';
import RNPlaygroundDapp from '../../../wdio/screen-objects/RNPlaygroundDapp.js';
import DappConnectionModal from '../../../wdio/screen-objects/Modals/DappConnectionModal.js';
import SignModal from '../../../wdio/screen-objects/Modals/SignModal.js';
import {
  unlockIfLockScreenVisible,
  ensurePlaygroundInstalled,
} from './utils.js';
import AppwrightGestures from '../../framework/AppwrightGestures.ts';

const DEFAULT_SCROLL_PARAMS = {
  scrollParams: { percent: 0.2 },
};

/**
 * After a MetaMask action (approve / sign / cancel), wait for the callback
 * deeplink to return to the playground. Falls back to activateApp if the
 * automatic return does not happen within a short window.
 */
async function returnToPlayground() {
  await AppwrightGestures.wait(2000);
  await RNPlaygroundDapp.ensureInPlayground();
}

test.beforeAll(() => {
  ensurePlaygroundInstalled();
});

test('@metamask/connect-legacy-evm-rn - Connect via Legacy EVM, sign, send transaction, and switch chains', async ({
  device,
}) => {
  RNPlaygroundDapp.device = device;
  DappConnectionModal.device = device;
  SignModal.device = device;

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
  // 2. Switch to the RN playground and connect via Legacy EVM
  //

  await RNPlaygroundDapp.switchToPlayground();
  await RNPlaygroundDapp.waitForPlaygroundReady();

  await RNPlaygroundDapp.tapConnectLegacy();
  await AppwrightGestures.wait(3000);

  await unlockIfLockScreenVisible(device);
  await AppwrightGestures.wait(5000);
  await DappConnectionModal.tapConnectButton();

  //
  // 3. Verify accountsChanged — Legacy EVM card visible with accounts
  //

  await returnToPlayground();
  await AppwrightGestures.wait(2000);

  await RNPlaygroundDapp.scrollToElement(RNPlaygroundDapp.appTitle, {
    scrollParams: { direction: 'down' },
  });
  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.legacyEvmCard,
    DEFAULT_SCROLL_PARAMS,
  );
  await RNPlaygroundDapp.assertLegacyEvmConnected();
  await RNPlaygroundDapp.assertLegacyEvmHasAccounts();
  await RNPlaygroundDapp.assertLegacyEvmActiveAccount();

  const initialChainId = await RNPlaygroundDapp.getLegacyEvmChainId();
  console.log(`Initial chain ID: ${initialChainId}`);

  //
  // 4. personal_sign — request, approve, verify result
  //

  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.legacyEvmBtnPersonalSign,
    DEFAULT_SCROLL_PARAMS,
  );
  await RNPlaygroundDapp.tapLegacyEvmButton(
    RNPlaygroundDapp.legacyEvmBtnPersonalSign,
  );
  await AppwrightGestures.wait(3000);

  await unlockIfLockScreenVisible(device);
  await AppwrightGestures.wait(1000);
  await SignModal.tapConfirmButton();

  await returnToPlayground();
  await AppwrightGestures.wait(1000);

  // Verify signature was returned (hex string starting with 0x)
  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.legacyEvmResponseText,
    DEFAULT_SCROLL_PARAMS,
  );
  const signResponse = await RNPlaygroundDapp.getLegacyEvmResponseText();
  console.log(`personal_sign response: ${signResponse}`);
  expect(signResponse).toContain('0x');

  //
  // 5. eth_sendTransaction — request, cancel (to avoid spending funds)
  //

  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.legacyEvmBtnSendTransaction,
    DEFAULT_SCROLL_PARAMS,
  );
  await RNPlaygroundDapp.tapLegacyEvmButton(
    RNPlaygroundDapp.legacyEvmBtnSendTransaction,
  );
  await AppwrightGestures.wait(3000);

  await unlockIfLockScreenVisible(device);
  await AppwrightGestures.wait(1000);

  // Cancel the transaction to avoid spending real funds
  await SignModal.tapCancelButton();

  await returnToPlayground();
  await AppwrightGestures.wait(1000);

  // The dapp should show an error (user rejected) in the response
  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.legacyEvmResponseText,
    DEFAULT_SCROLL_PARAMS,
  );
  const txResponse = await RNPlaygroundDapp.getLegacyEvmResponseText();
  console.log(`eth_sendTransaction (cancelled) response: ${txResponse}`);
  expect(txResponse.toLowerCase()).toContain('denied');

  //
  // 6. Chain switching from the dapp — wallet_switchEthereumChain
  //    Switch to Polygon from the dapp, verify the chain ID updates.
  //

  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.legacyEvmBtnSwitchPolygon,
    DEFAULT_SCROLL_PARAMS,
  );
  await RNPlaygroundDapp.tapLegacyEvmButton(
    RNPlaygroundDapp.legacyEvmBtnSwitchPolygon,
  );
  await AppwrightGestures.wait(3000);

  // The switch opens MetaMask with a network approval dialog.
  // The SwitchChainApproval dialog uses "connect-button" as its confirm testID.
  await unlockIfLockScreenVisible(device);
  await AppwrightGestures.wait(1000);
  await DappConnectionModal.tapConnectButton();

  await returnToPlayground();
  await AppwrightGestures.wait(2000);

  // Verify chain ID updated to Polygon (0x89)
  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.legacyEvmChainIdValue,
    { scrollParams: { direction: 'down' } },
  );
  const polygonChainId = await RNPlaygroundDapp.getLegacyEvmChainId();
  console.log(`Chain ID after dapp switch to Polygon: ${polygonChainId}`);
  expect(polygonChainId).toContain('0x89');
});
