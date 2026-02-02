/**
 * WalletConnect v2 POC Test
 *
 * This is a proof-of-concept test to validate that the Appwright framework
 * can successfully handle WalletConnect v2 connection flows.
 *
 * Test Flow:
 * 1. Login to MetaMask
 * 2. Launch Chrome and navigate to WalletConnect React App test dapp
 * 3. Tap Connect on the dapp
 * 4. Handle the native app chooser to select MetaMask
 * 5. Approve the WalletConnect session in MetaMask
 * 6. Return to browser and verify connected state
 */

import { test, expect } from 'appwright';
import { login } from '../../utils/Flows.js';
import {
  launchMobileBrowser,
  navigateToDapp,
} from '../../utils/MobileBrowser.js';
import AppwrightHelpers from '../../../tests/framework/AppwrightHelpers.js';
import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors.js';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures.js';
import DappConnectionModal from '../../../wdio/screen-objects/Modals/DappConnectionModal.js';
import MobileBrowserScreen from '../../../wdio/screen-objects/MobileBrowser.js';

/**
 * Dismisses Chrome first-run dialogs if they appear
 * Chrome shows various onboarding screens on first launch
 */
async function dismissChromeOnboarding(device) {
  MobileBrowserScreen.device = device;

  // Wait a moment for Chrome to fully load
  await AppwrightGestures.wait(2000);

  // Try to dismiss "Use without an account" / Sign-in screen
  try {
    const dismissButton = await MobileBrowserScreen.onboardingChromeWithoutAccount;
    if (dismissButton && (await dismissButton.isVisible({ timeout: 3000 }))) {
      console.log('Dismissing Chrome sign-in prompt...');
      await AppwrightGestures.tap(dismissButton);
      await AppwrightGestures.wait(1000);
    }
  } catch (e) {
    // No sign-in prompt, continue
  }

  // Try to dismiss "No thanks" button (various prompts)
  try {
    const noThanksButton = await MobileBrowserScreen.chromeNoThanksButton;
    if (noThanksButton && (await noThanksButton.isVisible({ timeout: 3000 }))) {
      console.log('Dismissing Chrome "No thanks" prompt...');
      await AppwrightGestures.tap(noThanksButton);
      await AppwrightGestures.wait(1000);
    }
  } catch (e) {
    // No "No thanks" button, continue
  }

  // Try to find and dismiss any "Accept & continue" or "Got it" buttons
  try {
    const acceptButton = await AppwrightSelectors.getElementByText(device, 'Accept & continue');
    if (await acceptButton.isVisible({ timeout: 2000 })) {
      console.log('Dismissing Chrome "Accept & continue" prompt...');
      await AppwrightGestures.tap(acceptButton);
      await AppwrightGestures.wait(1000);
    }
  } catch (e) {
    // No accept button, continue
  }

  // Try "No thanks" text button as well
  try {
    const noThanksText = await AppwrightSelectors.getElementByText(device, 'No thanks');
    if (await noThanksText.isVisible({ timeout: 2000 })) {
      console.log('Dismissing Chrome "No thanks" text button...');
      await AppwrightGestures.tap(noThanksText);
      await AppwrightGestures.wait(1000);
    }
  } catch (e) {
    // No "No thanks" text, continue
  }
}

// WalletConnect React App test dapp
const WC_TEST_DAPP_URL = 'https://react-app.walletconnect.com/';
const WC_TEST_DAPP_NAME = 'WalletConnect React App';

test('POC - WalletConnect v2 basic connection flow', async ({ device }) => {
  // Set device for screen objects
  DappConnectionModal.device = device;

  // Configure device settings for better stability
  await device.webDriverClient.updateSettings({
    waitForIdleTimeout: 100,
    waitForSelectorTimeout: 0,
    shouldWaitForQuiescence: false,
  });

  // Step 1: Login to MetaMask
  console.log('Step 1: Logging into MetaMask...');
  await AppwrightHelpers.withNativeAction(device, async () => {
    await login(device);
  });

  // Step 2: Launch Chrome and navigate to WC test dapp
  console.log('Step 2: Launching browser and navigating to WC test dapp...');
  await AppwrightHelpers.withNativeAction(device, async () => {
    await launchMobileBrowser(device);

    // Handle Chrome first-run dialogs if this is a fresh install
    await dismissChromeOnboarding(device);

    await navigateToDapp(device, WC_TEST_DAPP_URL, WC_TEST_DAPP_NAME);
  });

  // Wait for dapp to load
  await AppwrightGestures.wait(5000);

  // Step 3: Tap Connect on the dapp
  console.log('Step 3: Tapping Connect button on WC dapp...');
  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      // The WC React App has a "Connect" button
      // Using xpath to find the connect button by text content
      const connectButton = await AppwrightSelectors.getElementByText(
        device,
        'Connect',
      );
      await AppwrightGestures.tap(connectButton);
    },
    WC_TEST_DAPP_URL,
  );

  // Wait for modal with wallet options to appear
  await AppwrightGestures.wait(3000);

  // Step 4: Select WalletConnect option (this triggers the deeplink)
  console.log('Step 4: Selecting WalletConnect option...');
  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      // Look for WalletConnect option in the modal
      // The WC React App shows a modal with wallet options including WalletConnect
      const wcOption = await AppwrightSelectors.getElementByText(
        device,
        'WalletConnect',
      );
      await AppwrightGestures.tap(wcOption);
    },
    WC_TEST_DAPP_URL,
  );

  // Wait for QR modal and deeplink intent
  await AppwrightGestures.wait(3000);

  // Step 5: Handle the native app chooser to open with MetaMask
  console.log('Step 5: Handling native app chooser...');
  await AppwrightHelpers.withNativeAction(device, async () => {
    // On Android, a system dialog appears asking which app to open the wc: deeplink with
    // Look for MetaMask in the app chooser
    const metamaskOption = await AppwrightSelectors.getElementByXpath(
      device,
      '//android.widget.TextView[@text="MetaMask"]',
    );

    const isVisible = await metamaskOption.isVisible({ timeout: 10000 });
    if (isVisible) {
      await AppwrightGestures.tap(metamaskOption);
    } else {
      console.log('MetaMask app chooser not found, may have auto-opened');
    }
  });

  // Wait for MetaMask to process the WC session proposal
  await AppwrightGestures.wait(5000);

  // Step 6: Approve the WalletConnect session in MetaMask
  console.log('Step 6: Approving WalletConnect session...');
  await AppwrightHelpers.withNativeAction(device, async () => {
    // The DappConnectionModal should appear with the session proposal
    // Try to tap the connect button
    try {
      await DappConnectionModal.tapConnectButton();
      console.log('Session approved via DappConnectionModal');
    } catch (error) {
      console.log(
        'DappConnectionModal.tapConnectButton failed, trying fallback...',
      );
      // Fallback: try to find a generic "Connect" or "Approve" button
      const approveButton = await AppwrightSelectors.getElementByID(
        device,
        'connect-button',
      );
      const isVisible = await approveButton.isVisible({ timeout: 5000 });
      if (isVisible) {
        await AppwrightGestures.tap(approveButton);
        console.log('Session approved via fallback connect-button');
      } else {
        throw new Error('Could not find session approval button');
      }
    }
  });

  // Wait for session to be established
  await AppwrightGestures.wait(3000);

  // Step 7: Return to browser and verify connected state
  console.log('Step 7: Returning to browser to verify connection...');
  await launchMobileBrowser(device);
  await AppwrightGestures.wait(2000);

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      // After successful connection, the WC React App should show:
      // - Connected account address
      // - Chain information
      // - Various method buttons (personal_sign, etc.)

      // Look for evidence of successful connection
      // The app typically shows the connected address or "Disconnect" button
      const disconnectButton = await AppwrightSelectors.getElementByText(
        device,
        'Disconnect',
      );

      const isConnected = await disconnectButton.isVisible({ timeout: 15000 });

      if (isConnected) {
        console.log('SUCCESS: WalletConnect session established!');
        console.log(
          'Dapp shows Disconnect button, indicating active connection.',
        );
      } else {
        // Alternative check: look for account address display
        console.log(
          'Disconnect button not found, checking for account display...',
        );
      }

      // Assert that we see evidence of connection
      await expect(disconnectButton).toBeVisible({ timeout: 10000 });
    },
    WC_TEST_DAPP_URL,
  );

  console.log('POC Test Complete: WalletConnect v2 connection flow validated!');
});
