/**
 * WalletConnect v2 Session Management Tests
 *
 * Tests session management flow:
 *   connect → terminate app → relaunch → verify session persists →
 *   disconnect from MetaMask side → verify removed → verify dapp disconnected
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
import WalletConnectDapp from '../../../wdio/screen-objects/WalletConnectDapp.js';
import WalletConnectSessionsScreen from '../../../wdio/screen-objects/WalletConnectSessionsScreen.js';
import {
  connectWalletConnectSession,
  unlockIfLocked,
  WC_TEST_DAPP_URL,
  WC_SESSION_NAME,
} from './helpers.js';

test('WalletConnect v2 - session persists across app restart then disconnect', async ({
  device,
}) => {
  // ── Set device on screen objects ──────────────────────────────────
  WalletConnectSessionsScreen.device = device;

  // ── Connect ───────────────────────────────────────────────────────
  await connectWalletConnectSession(device);

  // ── Terminate MetaMask app ────────────────────────────────────────
  await AppwrightGestures.terminateApp(device);
  await AppwrightGestures.wait(3000);

  // ── Relaunch MetaMask ─────────────────────────────────────────────
  await AppwrightGestures.activateApp(device);
  await AppwrightGestures.wait(5000);

  // ── Unlock MetaMask if locked ─────────────────────────────────────
  await AppwrightHelpers.withNativeAction(device, async () => {
    await unlockIfLocked(device);
  });

  // ── Navigate to WalletConnect Sessions view ───────────────────────
  await AppwrightHelpers.withNativeAction(device, async () => {
    await WalletConnectSessionsScreen.navigateToSessionsView();
  });

  // ── Verify session still exists after restart ─────────────────────
  await AppwrightHelpers.withNativeAction(device, async () => {
    await WalletConnectSessionsScreen.assertSessionExists(WC_SESSION_NAME);
  });

  // ── Disconnect the session via long-press → "End" ────────────────
  await AppwrightHelpers.withNativeAction(device, async () => {
    await WalletConnectSessionsScreen.disconnectSession(WC_SESSION_NAME);
  });

  // ── Verify session removed from list ──────────────────────────────
  await AppwrightHelpers.withNativeAction(device, async () => {
    await WalletConnectSessionsScreen.assertNoActiveSessions();
  });

  // ── Switch to browser and verify dapp shows disconnected ──────────
  await launchMobileBrowser(device);
  await AppwrightGestures.wait(3000);

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WalletConnectDapp.assertDisconnected();
    },
    WC_TEST_DAPP_URL,
  );
});
