/**
 * WalletConnect v2 Connection Test
 *
 * Tests the full WalletConnect v2 connection lifecycle:
 *   connect → approve session → verify → disconnect
 *
 * Prerequisites:
 * - Android emulator running with MetaMask installed and wallet set up
 * - E2E_PASSWORD set in .e2e.env
 * - APK path configured via APK_PATH env var or in appwright.config.ts
 * - Chrome installed on the emulator
 */

import { test } from 'appwright';

import AppwrightHelpers from '../../../tests/framework/AppwrightHelpers.js';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures.js';
import WalletConnectDapp from '../../../wdio/screen-objects/WalletConnectDapp.js';
import { connectWalletConnectSession, WC_TEST_DAPP_URL } from './helpers.js';

test('WalletConnect v2 - Connect, verify, and disconnect', async ({
  device,
}) => {
  // ── Connect ───────────────────────────────────────────────────────
  await connectWalletConnectSession(device);

  // ── Disconnect (web context) ──────────────────────────────────────
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
