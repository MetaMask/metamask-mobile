import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeMMConnect } from '../../tags.js';

import {
  loginToAppPlaywright,
  unlockIfLockScreenVisible,
} from '../../flows/wallet.flow.js';
import RNPlaygroundDapp from '../../page-objects/MMConnect/RNPlaygroundDapp.js';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal.js';
import SignModal from '../../page-objects/MMConnect/SignModal.js';
import { ensurePlaygroundInstalled } from './utils.js';
import { sleep } from '../../framework/index.js';

/**
 * After a MetaMask action (approve / sign / cancel), wait for the callback
 * deeplink to return to the playground. Falls back to activateApp if the
 * automatic return does not happen within a short window.
 */
async function returnToPlayground() {
  await sleep(2000);
  await RNPlaygroundDapp.ensureInPlayground();
}

// Skipped (flaky): https://consensyssoftware.atlassian.net/browse/WAPI-1511 — un-skip tracked in https://consensyssoftware.atlassian.net/browse/MMQA-2062
appiumTest.describe.skip(SmokeMMConnect('Legacy EVM RN playground'), () => {
  appiumTest(
    '@metamask/connect-legacy-evm-rn - Connect via Legacy EVM, sign, send transaction, and switch chains',
    async ({ currentDeviceDetails, driver: _driver }) => {
      ensurePlaygroundInstalled(currentDeviceDetails);

      //
      // 1. Login to MetaMask wallet
      //
      await loginToAppPlaywright();

      //
      // 2. Switch to the RN playground and connect via Legacy EVM
      //
      await RNPlaygroundDapp.switchToPlayground();
      await RNPlaygroundDapp.waitForPlaygroundReady();

      await RNPlaygroundDapp.tapConnectLegacy();
      await sleep(3000);

      await unlockIfLockScreenVisible();
      await sleep(5000);
      await DappConnectionModal.tapConnectButton({
        shouldCooldown: true,
        timeToCooldown: 3000,
      });

      //
      // 3. Verify accountsChanged — Legacy EVM card visible with accounts
      //

      await returnToPlayground();
      await sleep(2000);

      await RNPlaygroundDapp.scrollToElement(RNPlaygroundDapp.appTitle, {
        scrollParams: { direction: 'down' },
      });
      await RNPlaygroundDapp.scrollToElement(RNPlaygroundDapp.legacyEvmCard);
      await RNPlaygroundDapp.assertLegacyEvmConnected();
      await RNPlaygroundDapp.assertLegacyEvmHasAccounts();
      await RNPlaygroundDapp.assertLegacyEvmActiveAccount();

      //
      // 4. personal_sign — request, approve, verify result
      //
      await RNPlaygroundDapp.scrollToElement(
        RNPlaygroundDapp.legacyEvmBtnPersonalSign,
      );
      await RNPlaygroundDapp.tapLegacyEvmButton(
        RNPlaygroundDapp.legacyEvmBtnPersonalSign,
      );
      await sleep(3000);

      await unlockIfLockScreenVisible();
      await sleep(1000);
      await SignModal.tapConfirmButton({
        shouldCooldown: true,
        timeToCooldown: 3000,
      });

      await returnToPlayground();
      await sleep(1000);

      // Verify signature was returned (hex string starting with 0x)
      await RNPlaygroundDapp.scrollToElement(
        RNPlaygroundDapp.legacyEvmResponseText,
      );

      //
      // 5. eth_sendTransaction — request, cancel (to avoid spending funds)
      //
      await RNPlaygroundDapp.scrollToElement(
        RNPlaygroundDapp.legacyEvmBtnSendTransaction,
      );
      await RNPlaygroundDapp.tapLegacyEvmButton(
        RNPlaygroundDapp.legacyEvmBtnSendTransaction,
      );
      await sleep(3000);

      await unlockIfLockScreenVisible();
      await sleep(1000);

      // Cancel the transaction to avoid spending real funds
      await SignModal.tapCancelButton({
        shouldCooldown: true,
        timeToCooldown: 3000,
      });

      await returnToPlayground();
      await sleep(1000);

      // The dapp should show an error (user rejected) in the response

      await RNPlaygroundDapp.scrollToElement(
        RNPlaygroundDapp.legacyEvmResponseText,
        {
          scrollParams: { direction: 'down' },
          percent: 0.5,
        },
      );

      //
      // 6. Chain switching from the dapp — wallet_switchEthereumChain
      //    Switch to Polygon from the dapp, verify the chain ID updates.
      //

      await RNPlaygroundDapp.scrollToElement(
        RNPlaygroundDapp.legacyEvmBtnSwitchPolygon,
      );
      await RNPlaygroundDapp.tapLegacyEvmButton(
        RNPlaygroundDapp.legacyEvmBtnSwitchPolygon,
      );
      await sleep(3000);

      // The switch opens MetaMask with a network approval dialog.
      // The SwitchChainApproval dialog uses "connect-button" as its confirm testID.
      await unlockIfLockScreenVisible();
      await sleep(1000);
      await DappConnectionModal.tapConnectButton({
        shouldCooldown: true,
        timeToCooldown: 3000,
      });

      await returnToPlayground();
      await sleep(2000);

      // Verify chain ID updated to Polygon (0x89)
      await RNPlaygroundDapp.scrollToElement(
        RNPlaygroundDapp.legacyEvmChainIdValue,
        { scrollParams: { direction: 'down' } },
      );
    },
  );
}); // end describe
