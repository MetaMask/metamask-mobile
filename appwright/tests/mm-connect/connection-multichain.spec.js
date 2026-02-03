import { test } from 'appwright';

import { login } from '../../utils/Flows.js';
import {
  launchMobileBrowser,
  navigateToDapp,
} from '../../utils/MobileBrowser.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import BrowserPlaygroundDapp from '../../../wdio/screen-objects/BrowserPlaygroundDapp.js';
import AndroidScreenHelpers from '../../../wdio/screen-objects/Native/Android.js';
import DappConnectionModal from '../../../wdio/screen-objects/Modals/DappConnectionModal.js';
import AppwrightHelpers from '../../../tests/framework/AppwrightHelpers.js';
import PlaygroundDappServer from './helpers/PlaygroundDappServer.js';

// Local server configuration
const DAPP_PORT = 8090;
const DAPP_NAME = 'MetaMask MultiChain API Test Dapp';

// Start local playground server before all tests
test.beforeAll(async () => {
  await PlaygroundDappServer.start(DAPP_PORT);
});

// Stop local playground server after all tests
test.afterAll(async () => {
  await PlaygroundDappServer.stop();
});

test('@metamask/connect-multichain - Connect via Multichain API to Local Browser Playground', async ({
  device,
}) => {
  // Get platform-specific URL
  const platform = device.getPlatform?.() || 'android';
  const DAPP_URL = PlaygroundDappServer.getUrl(platform);

  // Initialize page objects with device
  WalletMainScreen.device = device;
  BrowserPlaygroundDapp.device = device;
  AndroidScreenHelpers.device = device;
  DappConnectionModal.device = device;

  await device.webDriverClient.updateSettings({
    waitForIdleTimeout: 100,
    waitForSelectorTimeout: 0,
    shouldWaitForQuiescence: false,
  });

  //
  // Login and navigate to dapp
  //

  await AppwrightHelpers.withNativeAction(device, async () => {
    await login(device);
    await WalletMainScreen.isMainWalletViewVisible();
    await launchMobileBrowser(device);
    await navigateToDapp(device, DAPP_URL, DAPP_NAME);
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  //
  // Connect via Multichain API
  //

  // Tap the Connect button (multichain API - default scopes)
  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.tapConnect();
    },
    DAPP_URL,
  );

  // Handle connection approval in MetaMask
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton();
  });

  // Explicit pause to avoid navigating back too fast to the dapp
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  //
  // Verify connection
  //

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      // Verify connected by checking for scope cards section
      await BrowserPlaygroundDapp.assertMultichainConnected(true);

      // Verify at least one scope card is visible (eip155:1 is default)
      await BrowserPlaygroundDapp.assertScopeCardVisible('eip155:1');
    },
    DAPP_URL,
  );

  //
  // Cleanup - disconnect
  //

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.tapDisconnect();
    },
    DAPP_URL,
  );
});
