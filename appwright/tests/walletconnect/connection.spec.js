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

import { login } from '../../utils/Flows.js';
import { getPasswordForScenario } from '../../utils/TestConstants.js';
import { launchMobileBrowser } from '../../utils/MobileBrowser.js';
import AppwrightHelpers from '../../../tests/framework/AppwrightHelpers.js';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures.js';
import MobileBrowserScreen from '../../../wdio/screen-objects/MobileBrowser.js';
import AndroidScreenHelpers from '../../../wdio/screen-objects/Native/Android.js';
import DappConnectionModal from '../../../wdio/screen-objects/Modals/DappConnectionModal.js';
import LoginScreen from '../../../wdio/screen-objects/LoginScreen.js';
import WalletConnectDapp from '../../../wdio/screen-objects/WalletConnectDapp.js';

const WC_TEST_DAPP_URL = 'https://react-app.walletconnect.com/';

/**
 * Navigate Chrome to a URL. Handles both fresh Chrome (home page with search
 * box) and Chrome that already has a tab open (URL bar visible instead).
 */
async function navigateChromeToUrl(device, url) {
  MobileBrowserScreen.device = device;

  // Try the home page search box first (fresh Chrome)
  let focused = false;
  try {
    const searchBox = await MobileBrowserScreen.chromeHomePageSearchBox;
    if (searchBox && (await searchBox.isVisible({ timeout: 3000 }))) {
      await AppwrightGestures.tap(searchBox);
      focused = true;
    }
  } catch (_) {}

  // Fallback: tap the URL entry area (Chrome already on a page)
  if (!focused) {
    try {
      const urlEntry = await MobileBrowserScreen.chromeUrlEntry;
      if (urlEntry && (await urlEntry.isVisible({ timeout: 3000 }))) {
        await AppwrightGestures.tap(urlEntry);
        focused = true;
      }
    } catch (_) {}
  }

  // Type URL into the focused omnibox and navigate
  await AppwrightGestures.typeText(await MobileBrowserScreen.chromeUrlBar, url);
  await MobileBrowserScreen.tapSelectDappUrl();
}

/**
 * Dismiss Chrome first-run dialogs if they appear.
 * Focuses on the two known onboarding screens: sign-in dismissal and
 * "No thanks" notification prompt. Skips gracefully if not found.
 */
async function dismissChromeOnboarding(device) {
  MobileBrowserScreen.device = device;
  await AppwrightGestures.wait(2000);

  // Try to dismiss "Use without an account" / Sign-in screen
  try {
    const dismissButton =
      await MobileBrowserScreen.onboardingChromeWithoutAccount;
    if (dismissButton && (await dismissButton.isVisible({ timeout: 3000 }))) {
      await AppwrightGestures.tap(dismissButton);
      await AppwrightGestures.wait(1000);
    }
  } catch (_) {
    // No sign-in prompt
  }

  // Try to dismiss "No thanks" button
  try {
    const noThanksButton = await MobileBrowserScreen.chromeNoThanksButton;
    if (noThanksButton && (await noThanksButton.isVisible({ timeout: 3000 }))) {
      await AppwrightGestures.tap(noThanksButton);
      await AppwrightGestures.wait(1000);
    }
  } catch (_) {
    // No "No thanks" button
  }
}

test('WalletConnect v2 - Connect, verify, and disconnect', async ({
  device,
}) => {
  // ── Setup ────────────────────────────────────────────────────────
  WalletConnectDapp.device = device;
  AndroidScreenHelpers.device = device;
  DappConnectionModal.device = device;
  LoginScreen.device = device;

  await device.webDriverClient.updateSettings({
    waitForIdleTimeout: 100,
    waitForSelectorTimeout: 0,
    shouldWaitForQuiescence: false,
  });

  // ── Phase 1: Login (native) ──────────────────────────────────────
  await AppwrightHelpers.withNativeAction(device, async () => {
    await login(device);
  });

  // ── Phase 2: Launch browser & navigate to dapp (native) ──────────
  await AppwrightHelpers.withNativeAction(device, async () => {
    await launchMobileBrowser(device);
    await dismissChromeOnboarding(device);
    await navigateChromeToUrl(device, WC_TEST_DAPP_URL);
  });

  // Wait for React app to hydrate
  await AppwrightGestures.wait(5000);

  // ── Phase 3: Select network & initiate connection (web context) ───
  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WalletConnectDapp.tapEthereumSepolia();
      await AppwrightGestures.wait(1000);
      await WalletConnectDapp.tapConnectButton();
    },
    WC_TEST_DAPP_URL,
  );

  // Wait for wallet selection modal to render
  await AppwrightGestures.wait(3000);

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WalletConnectDapp.tapMetaMaskOption();
      await AppwrightGestures.wait(2000);
      //await WalletConnectDapp.tapOpenButton();
    },
    WC_TEST_DAPP_URL,
  );

  // Wait for deeplink to trigger
  await AppwrightGestures.wait(3000);

  // ── Phase 4: Handle native app chooser ─────────────────────────────
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
  });

  await AppwrightGestures.wait(3000);

  // ── Phase 4b: Unlock MetaMask if locked ───────────────────────────
  // TODO: This step may be optional on some devices/configurations where
  // the wallet stays unlocked in background. Skip gracefully if not needed.
  await AppwrightHelpers.withNativeAction(device, async () => {
    try {
      const passwordInput = await LoginScreen.getPasswordInputElement;
      if (passwordInput && (await passwordInput.isVisible({ timeout: 5000 }))) {
        const password = getPasswordForScenario('login');
        await LoginScreen.typePassword(password);
        await LoginScreen.tapUnlockButton();
        await AppwrightGestures.wait(3000);
      }
    } catch (_) {
      // Wallet was not locked, continue
    }
  });

  // Wait for MetaMask to process the WC session proposal
  await AppwrightGestures.wait(5000);

  // ── Phase 5: Approve session (native context) ────────────────────
  await AppwrightHelpers.withNativeAction(device, async () => {
    await DappConnectionModal.tapConnectButton();
  });

  // Wait for session to be established
  await AppwrightGestures.wait(3000);

  // ── Phase 6: Verify connection (web context) ─────────────────────
  await launchMobileBrowser(device);
  await AppwrightGestures.wait(2000);

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WalletConnectDapp.isConnected();
    },
    WC_TEST_DAPP_URL,
  );

  // ── Phase 7: Disconnect (web context) ────────────────────────────
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
