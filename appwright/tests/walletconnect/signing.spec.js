/**
 * WalletConnect v2 Signing Tests
 *
 * Tests signing flows after connecting:
 *   connect →
 *   personal_sign approve → verify →
 *   personal_sign reject → verify →
 *   eth_signTypedData_v4 approve → verify →
 *   eth_signTypedData_v4 reject → verify →
 *   eth_sendTransaction reject (NEVER confirm) → verify →
 *   disconnect
 *
 * Prerequisites:
 * - Android emulator running with MetaMask installed and wallet set up
 * - E2E_PASSWORD set in .e2e.env
 * - APK path configured via APK_PATH env var or in appwright.config.ts
 * - Chrome installed on the emulator
 */

import { test } from 'appwright';

import { launchMobileBrowser } from '../../utils/MobileBrowser.js';
import AppwrightHelpers from '../../../tests/framework/AppwrightHelpers.js';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures.js';
import SignModal from '../../../wdio/screen-objects/Modals/SignModal.js';
import WalletConnectDapp from '../../../wdio/screen-objects/WalletConnectDapp.js';
import {
  connectWalletConnectSession,
  switchToMetaMask,
  WC_TEST_DAPP_URL,
} from './helpers.js';

/**
 * Trigger a dapp method button, switch to MetaMask, perform an action
 * (confirm or cancel), switch back to browser, and assert the result.
 */
async function signingFlow(device, { tapMethod, confirm, assertResult }) {
  // Tap the method button on the dapp
  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await tapMethod();
    },
    WC_TEST_DAPP_URL,
  );

  // Wait for MetaMask to receive the signing request
  await AppwrightGestures.wait(3000);

  // Switch to MetaMask (app chooser or direct activation)
  await AppwrightHelpers.withNativeAction(device, async () => {
    await switchToMetaMask(device);
  });

  await AppwrightGestures.wait(3000);

  // Confirm or reject the request
  await AppwrightHelpers.withNativeAction(device, async () => {
    if (confirm) {
      await SignModal.tapConfirmButton();
    } else {
      await SignModal.tapCancelButton();
    }
  });

  // Switch back to browser and verify result
  await AppwrightGestures.wait(2000);
  await launchMobileBrowser(device);
  await AppwrightGestures.wait(2000);

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await assertResult();
    },
    WC_TEST_DAPP_URL,
  );
}

test('WalletConnect v2 - signing flows (approve, reject, transaction)', async ({
  device,
}) => {
  SignModal.device = device;

  // ── Connect ───────────────────────────────────────────────────────
  await connectWalletConnectSession(device);

  // ── personal_sign approve ─────────────────────────────────────────
  await signingFlow(device, {
    tapMethod: () => WalletConnectDapp.tapPersonalSignButton(),
    confirm: true,
    assertResult: () => WalletConnectDapp.assertPersonalSignApproved(),
  });

  // ── personal_sign reject ──────────────────────────────────────────
  await signingFlow(device, {
    tapMethod: () => WalletConnectDapp.tapPersonalSignButton(),
    confirm: false,
    assertResult: () => WalletConnectDapp.assertPersonalSignRejected(),
  });

  // ── eth_signTypedData_v4 approve ──────────────────────────────────
  await signingFlow(device, {
    tapMethod: () => WalletConnectDapp.tapSignTypedDataV4Button(),
    confirm: true,
    assertResult: () => WalletConnectDapp.assertSignTypedDataV4Approved(),
  });

  // ── eth_signTypedData_v4 reject ───────────────────────────────────
  await signingFlow(device, {
    tapMethod: () => WalletConnectDapp.tapSignTypedDataV4Button(),
    confirm: false,
    assertResult: () => WalletConnectDapp.assertSignTypedDataV4Rejected(),
  });

  // ── eth_sendTransaction reject (NEVER confirm) ────────────────────
  await signingFlow(device, {
    tapMethod: () => WalletConnectDapp.tapSendTransactionButton(),
    confirm: false,
    assertResult: () => WalletConnectDapp.assertSendTransactionRejected(),
  });

  // ── Cleanup: Disconnect ──────────────────────────────────────────
  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WalletConnectDapp.tapDisconnectButton();
      await AppwrightGestures.wait(2000);
      await WalletConnectDapp.assertDisconnected();
    },
    WC_TEST_DAPP_URL,
  );
});
