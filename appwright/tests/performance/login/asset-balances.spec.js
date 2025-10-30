import { test } from '../../../fixtures/performance-test.js';

import TimerHelper from '../../../utils/TimersHelper.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import TabBarModal from '../../../../wdio/screen-objects/Modals/TabBarModal.js';
import LoginScreen from '../../../../wdio/screen-objects/LoginScreen.js';
import { login } from '../../../utils/Flows.js';
import AppwrightSelectors from '../../../../e2e/framework/AppwrightSelectors.js';
import { expect as appwrightExpect } from 'appwright';

/* Scenario: Asset Balances Load Time - Measure time to load tokens tab after switching from NFTs */
test('Asset Balances - Tokens Tab Load Time (NFT to Tokens)', async ({
  device,
  performanceTracker,
}, testInfo) => {
  // Set device for screen objects
  WalletMainScreen.device = device;
  TabBarModal.device = device;
  LoginScreen.device = device;

  // Login to the wallet
  await login(device);

  // Ensure we're on the wallet main screen
  await WalletMainScreen.isMainWalletViewVisible();

  // Navigate to wallet tab to ensure we're on the wallet view
  await TabBarModal.tapWalletButton();

  // Wait a moment for the initial load
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // First, click on NFT tab
  console.log('Clicking on NFT tab...');
  await WalletMainScreen.tapNFTTab();

  // Wait for NFT tab to be displayed
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Create timer to measure tokens tab load time
  const tokensTabLoadTimer = new TimerHelper(
    'Time from clicking Tokens tab (from NFT tab) until all tokens are visible and loaded',
  );

  // Start timer and click on Tokens tab
  console.log('Clicking on Tokens tab...');
  tokensTabLoadTimer.start();
  await WalletMainScreen.tapTokensTab();

  // Wait for the tokens container to be visible
  const tokensContainer = await AppwrightSelectors.getElementByID(
    device,
    'tokens-container',
  );
  await appwrightExpect(tokensContainer).toBeVisible({ timeout: 30000 });

  // Wait for the token list to be visible and loaded
  const tokenList = await AppwrightSelectors.getElementByID(
    device,
    'token-list',
  );
  await appwrightExpect(tokenList).toBeVisible({ timeout: 30000 });

  // Stop timer once tokens are fully loaded
  tokensTabLoadTimer.stop();

  console.log(`Tokens tab loaded in: ${tokensTabLoadTimer.getDuration()}ms`);

  // Add timer to performance tracker
  performanceTracker.addTimer(tokensTabLoadTimer);

  // Attach performance metrics to test
  await performanceTracker.attachToTest(testInfo);
});

/* Scenario: Asset Balances Refresh Time - Measure time to refresh tokens list after tab switch */
test('Asset Balances - Tokens Refresh Time (after NFT switch)', async ({
  device,
  performanceTracker,
}, testInfo) => {
  // Set device for screen objects
  WalletMainScreen.device = device;
  TabBarModal.device = device;
  LoginScreen.device = device;

  // Login to the wallet
  await login(device);

  // Ensure we're on the wallet main screen
  await WalletMainScreen.isMainWalletViewVisible();

  // Navigate to wallet tab
  await TabBarModal.tapWalletButton();

  // Wait a moment for the initial load
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Click on NFT tab first
  console.log('Clicking on NFT tab...');
  await WalletMainScreen.tapNFTTab();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Click back to Tokens tab
  console.log('Clicking on Tokens tab...');
  await WalletMainScreen.tapTokensTab();

  // Wait for tokens container to be visible
  const tokensContainer = await AppwrightSelectors.getElementByID(
    device,
    'tokens-container',
  );
  await appwrightExpect(tokensContainer).toBeVisible({ timeout: 30000 });

  // Create timer to measure refresh time
  const tokensRefreshTimer = new TimerHelper(
    'Time to refresh and reload all tokens after pull-to-refresh gesture',
  );

  // Start timer and perform pull-to-refresh
  console.log('Performing pull-to-refresh...');
  tokensRefreshTimer.start();

  // Perform swipe down gesture to refresh (pull-to-refresh)
  const isAndroid = AppwrightSelectors.isAndroid(device);
  if (isAndroid) {
    await device.swipe({ x: 200, y: 400 }, { x: 200, y: 800 }, 500);
  } else {
    // iOS swipe
    await device.swipe({ x: 200, y: 400 }, { x: 200, y: 800 }, 500);
  }

  // Wait a moment for refresh to start
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Wait for token list to be visible again (refresh complete)
  const tokenList = await AppwrightSelectors.getElementByID(
    device,
    'token-list',
  );
  await appwrightExpect(tokenList).toBeVisible({ timeout: 30000 });

  // Stop timer once tokens are refreshed
  tokensRefreshTimer.stop();

  console.log(`Tokens refreshed in: ${tokensRefreshTimer.getDuration()}ms`);

  // Add timer to performance tracker
  performanceTracker.addTimer(tokensRefreshTimer);

  // Attach performance metrics to test
  await performanceTracker.attachToTest(testInfo);
});

/* Scenario: Asset Balances - Individual Token Load Time after tab switch */
test('Asset Balances - Individual Token Visibility (NFT to Tokens)', async ({
  device,
  performanceTracker,
}, testInfo) => {
  // Set device for screen objects
  WalletMainScreen.device = device;
  TabBarModal.device = device;
  LoginScreen.device = device;

  // Login to the wallet
  await login(device);

  // Ensure we're on the wallet main screen
  await WalletMainScreen.isMainWalletViewVisible();

  // Navigate to wallet tab
  await TabBarModal.tapWalletButton();

  // Wait a moment for the initial load
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Click on NFT tab first
  console.log('Clicking on NFT tab...');
  await WalletMainScreen.tapNFTTab();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Create timer to measure time for first token to appear after switching tabs
  const firstTokenVisibilityTimer = new TimerHelper(
    'Time from clicking Tokens tab (from NFT) until first token is visible in the list',
  );

  // Start timer and click on Tokens tab
  console.log('Clicking on Tokens tab...');
  firstTokenVisibilityTimer.start();
  await WalletMainScreen.tapTokensTab();

  // Wait for first token to appear in the list
  const isAndroid = AppwrightSelectors.isAndroid(device);
  let firstToken;

  if (isAndroid) {
    // On Android, look for any token in the list
    firstToken = await AppwrightSelectors.getElementByXpath(
      device,
      '//*[@resource-id="token-list"]//*[contains(@resource-id, "asset-")]',
    );
  } else {
    // On iOS, look for any token in the list
    firstToken = await AppwrightSelectors.getElementByXpath(
      device,
      '//*[@name="token-list"]//XCUIElementTypeOther[1]',
    );
  }

  await appwrightExpect(firstToken).toBeVisible({ timeout: 30000 });

  // Stop timer
  firstTokenVisibilityTimer.stop();

  console.log(
    `First token visible in: ${firstTokenVisibilityTimer.getDuration()}ms`,
  );

  // Add timer to performance tracker
  performanceTracker.addTimer(firstTokenVisibilityTimer);

  // Attach performance metrics to test
  await performanceTracker.attachToTest(testInfo);
});
