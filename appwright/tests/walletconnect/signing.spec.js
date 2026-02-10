/**
 * WalletConnect v2 Signing Tests
 *
 * Tests personal_sign approve and reject flows:
 *   connect → personal_sign approve → verify → personal_sign reject → verify → disconnect
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

test('WalletConnect v2 - personal_sign approve and reject', async ({
  device,
}) => {
  SignModal.device = device;

  // ── Connect ───────────────────────────────────────────────────────
  await connectWalletConnectSession(device);

  // ── Test A: personal_sign approve ─────────────────────────────────
  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WalletConnectDapp.tapPersonalSignButton();
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

  // Approve the sign request
  await AppwrightHelpers.withNativeAction(device, async () => {
    await SignModal.tapConfirmButton();
  });

  // Switch back to browser and verify approval
  await AppwrightGestures.wait(2000);
  await launchMobileBrowser(device);
  await AppwrightGestures.wait(2000);

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WalletConnectDapp.assertRequestApproved();
    },
    WC_TEST_DAPP_URL,
  );

  // ── Test B: personal_sign reject ──────────────────────────────────
  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WalletConnectDapp.tapPersonalSignButton();
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

  // Reject the sign request
  await AppwrightHelpers.withNativeAction(device, async () => {
    await SignModal.tapCancelButton();
  });

  // Switch back to browser and verify rejection
  await AppwrightGestures.wait(2000);
  await launchMobileBrowser(device);
  await AppwrightGestures.wait(2000);

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WalletConnectDapp.assertRequestRejected();
    },
    WC_TEST_DAPP_URL,
  );

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
