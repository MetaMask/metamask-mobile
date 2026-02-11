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
import {
  DappServer,
  DappVariants,
  TestDapps,
} from '../../../tests/framework/index.ts';
import {
  getDappUrlForBrowser,
  setupAdbReverse,
  cleanupAdbReverse,
} from './utils.js';

const DAPP_NAME = 'MetaMask MultiChain API Test Dapp';
const DAPP_PORT = 8090;

// NOTE: This test requires the testing SRP to be used
const ACCOUNT_1_ADDRESS = '0x19a7Ad8256ab119655f1D758348501d598fC1C94';

// Create the playground server using the shared framework
const playgroundServer = new DappServer({
  dappCounter: 0,
  rootDirectory: TestDapps[DappVariants.BROWSER_PLAYGROUND].dappPath,
  dappVariant: DappVariants.BROWSER_PLAYGROUND,
});

// Start local playground server before all tests
test.beforeAll(async () => {
  // Set port and start the server directly (bypassing Detox-specific utilities)
  playgroundServer.setServerPort(DAPP_PORT);
  await playgroundServer.start();

  // Set up adb reverse for Android emulator access
  setupAdbReverse(DAPP_PORT);
});

// Stop local playground server after all tests
test.afterAll(async () => {
  cleanupAdbReverse(DAPP_PORT);
  await playgroundServer.stop();
});

test('@metamask/connect-multichain (multiple clients) - Connect multiple clients via Multichain API to Local Browser Playground', async ({
  device,
}) => {
  // Get platform-specific URL
  const platform = device.getPlatform?.() || 'android';
  const DAPP_URL = getDappUrlForBrowser(platform);

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
    await DappConnectionModal.tapEditNetworksButton();
    await DappConnectionModal.tapNetworkButton('Solana');
    await DappConnectionModal.tapUpdateNetworksButton();
    await DappConnectionModal.tapConnectButton();
  });

  // Explicit pause to avoid navigating back too fast to the dapp
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      // Verify connected by checking for scope cards section
      await BrowserPlaygroundDapp.assertMultichainConnected(true);

      // Verify at least one scope card is visible (eip155:1 is default)
      await BrowserPlaygroundDapp.assertScopeCardVisible('eip155:1');

      // Verify evm card is visible
      await BrowserPlaygroundDapp.assertConnected(true);
      await BrowserPlaygroundDapp.assertChainIdValue('0x1');
      await BrowserPlaygroundDapp.assertActiveAccount(ACCOUNT_1_ADDRESS);

      // Verify wagmi card is visible
      await BrowserPlaygroundDapp.assertWagmiConnected(true);
      await BrowserPlaygroundDapp.assertWagmiChainIdValue('1');
      await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_1_ADDRESS);

      // NOTE: The solana wallet standard does not respond to wallet_sessionChanged events
      // meaning that we must manually trigger the client to check if it is connected.
      // Since we are, there will be no approval prompt necessary to accept.
      // TODO
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
