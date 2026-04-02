import { test } from '../../framework/fixture';
import TimerHelper from '../../framework/TimerHelper';

import { loginToAppPlaywright } from '../../flows/wallet.flow';
import {
  switchToMobileBrowser,
  navigateToDapp,
  refreshMobileBrowser,
  launchMobileBrowser,
} from '../../framework/utils/MobileBrowser';
import WalletView from '../../page-objects/wallet/WalletView';
import BrowserPlaygroundDapp from '../../page-objects/MMConnect/BrowserPlaygroundDapp';
import AndroidScreenHelpers from '../../page-objects/MMConnect/AndroidScreenHelpers';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal';
import SignModal from '../../page-objects/MMConnect/SignModal';
import SwitchChainModal from '../../page-objects/MMConnect/SwitchChainModal';
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import {
  PlaywrightGestures,
  DappServer,
  DappVariants,
  TestDapps,
  sleep,
} from '../../framework';
import {
  getDappUrlForBrowser,
  setupAdbReverse,
  cleanupAdbReverse,
  waitForDappServerReady,
  unlockIfLockScreenVisible,
  ensureAccountGroupsFinishedLoading,
} from './utils';

const DAPP_NAME = 'MetaMask MultiChain API Test Dapp';
const DAPP_PORT = 8090;

// NOTE: This test requires the testing SRP to be used
const ACCOUNT_1_ADDRESS = '0x19a7Ad8256ab119655f1D758348501d598fC1C94';
const ACCOUNT_3_ADDRESS = '0xE2bEca5CaDC60b61368987728b4229822e6CDa83';

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
  await waitForDappServerReady(DAPP_PORT);

  // Set up adb reverse for Android emulator access
  setupAdbReverse(DAPP_PORT);
});

// Stop local playground server after all tests
test.afterAll(async () => {
  cleanupAdbReverse(DAPP_PORT);
  await playgroundServer.stop();
});

test('@metamask/connect-evm - Connect via EVM Legacy Connection to Local Browser Playground', async ({
  currentDeviceDetails,
  driver,
  performanceTracker,
}) => {
  const platform = currentDeviceDetails.platform;
  const useBrowserStackLocal =
    process.env.BROWSERSTACK_LOCAL?.toLowerCase() === 'true';
  const DAPP_URL = useBrowserStackLocal
    ? `http://bs-local.com:${DAPP_PORT}`
    : getDappUrlForBrowser(platform);

  await driver.updateSettings({
    waitForIdleTimeout: 100,
    waitForSelectorTimeout: 0,
    shouldWaitForQuiescence: false,
  });

  const connectTimer = new TimerHelper(
    'Time from tapping Connect (Legacy) to dapp confirming EVM connected state',
    { ios: 20000, android: 30000 },
    currentDeviceDetails.platform,
  );
  const signTimer = new TimerHelper(
    'Time from tapping Personal Sign to dapp displaying signature response',
    { ios: 12000, android: 18000 },
    currentDeviceDetails.platform,
  );
  const switchChainTimer = new TimerHelper(
    'Time from tapping Switch to Polygon to dapp confirming chain ID 0x89',
    { ios: 12000, android: 18000 },
    currentDeviceDetails.platform,
  );
  const refreshReconnectTimer = new TimerHelper(
    'Time from refreshing browser to dapp confirming EVM still connected',
    { ios: 8000, android: 12000 },
    currentDeviceDetails.platform,
  );
  const reconnectTimer = new TimerHelper(
    'Time from tapping Connect (Legacy) after disconnect to dapp confirming reconnected',
    { ios: 20000, android: 30000 },
    currentDeviceDetails.platform,
  );

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await loginToAppPlaywright();
    await ensureAccountGroupsFinishedLoading(currentDeviceDetails);
    await launchMobileBrowser(driver);
    await navigateToDapp(driver, DAPP_URL, DAPP_NAME);
  });
  await sleep(5000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    connectTimer.start();
    await BrowserPlaygroundDapp.tapConnectLegacy();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await unlockIfLockScreenVisible();
    await DappConnectionModal.tapEditAccountsButton();
    await DappConnectionModal.tapAccountButton('Account 3');
    await DappConnectionModal.tapUpdateAccountsButton();
    await DappConnectionModal.tapConnectButton();
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertConnected(true);
    connectTimer.stop();
    await BrowserPlaygroundDapp.assertChainIdValue('0x1');
    await BrowserPlaygroundDapp.assertActiveAccount(ACCOUNT_1_ADDRESS);
    signTimer.start();
    await BrowserPlaygroundDapp.tapPersonalSign();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapConfirmButton();
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertResponseValue(
      // Account 1 signed the message
      '0x361c13288b4ab02d50974efddf9e4e7ca651b81c298b614be908c4754abb1dd8328224645a1a8d0fab561c4b855c7bdcebea15db5ae8d1778a1ea791dbd05c2a1b',
    );
    signTimer.stop();
    await BrowserPlaygroundDapp.tapSendTransaction();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Ethereum');
    await SignModal.tapCancelButton();
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    // Note: Error message may differ slightly in browser playground
    await BrowserPlaygroundDapp.assertResponseValue('denied');
    switchChainTimer.start();
    await BrowserPlaygroundDapp.tapSwitchToPolygon();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SwitchChainModal.assertNetworkText('Polygon');
    await SwitchChainModal.tapConnectButton();
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertChainIdValue('0x89');
    switchChainTimer.stop();
    await BrowserPlaygroundDapp.tapSendTransaction();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Polygon');
    await SignModal.tapCancelButton();
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapSwitchToMainnet();
    await BrowserPlaygroundDapp.assertChainIdValue('0x1');
    await BrowserPlaygroundDapp.tapSendTransaction();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Ethereum');
    await SignModal.tapCancelButton();

    // Wait here to make sure UI is visible before attempted interaction
    await sleep(1000);

    // Change selected account to Account 3 in MetaMask
    await WalletView.tapIdenticon();
    await AccountListBottomSheet.tapAccountByName('Account 3');
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    // Verify account changed to Account 3
    await BrowserPlaygroundDapp.assertActiveAccount(ACCOUNT_3_ADDRESS);
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    refreshReconnectTimer.start();
    await refreshMobileBrowser(driver);
  });
  await sleep(2000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertConnected(true);
    refreshReconnectTimer.stop();
    await BrowserPlaygroundDapp.assertChainIdValue('0x1');
    await BrowserPlaygroundDapp.assertActiveAccount(ACCOUNT_3_ADDRESS);
    await BrowserPlaygroundDapp.tapPersonalSign();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapCancelButton();
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertResponseValue('rejected');
  }, DAPP_URL);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapDisconnect();
    await BrowserPlaygroundDapp.assertConnected(false);
    reconnectTimer.start();
    await BrowserPlaygroundDapp.tapConnectLegacy();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton();
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertConnected(true);
    reconnectTimer.stop();
    await BrowserPlaygroundDapp.assertChainIdValue('0x1');
    await BrowserPlaygroundDapp.assertActiveAccount(ACCOUNT_3_ADDRESS);
    await BrowserPlaygroundDapp.tapPersonalSign();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapCancelButton();
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertResponseValue('rejected');
  }, DAPP_URL);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapDisconnect();
    await BrowserPlaygroundDapp.tapConnectLegacy();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    // Purposely not interacting with the approval
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await refreshMobileBrowser(driver);
  });
  await sleep(2000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertConnected(false);
  }, DAPP_URL);

  await sleep(10000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertConnected(false);
    await BrowserPlaygroundDapp.tapConnectLegacy();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton();
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertConnected(true);
    await BrowserPlaygroundDapp.assertChainIdValue('0x1');
  }, DAPP_URL);

  performanceTracker.addTimers(
    connectTimer,
    signTimer,
    switchChainTimer,
    refreshReconnectTimer,
    reconnectTimer,
  );

  //
  // Read-only method should hit rpc endpoint instead of wallet
  //

  await PlaywrightGestures.terminateApp(currentDeviceDetails);
  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapGetBalance();
    await sleep(10000);
    // Balance response should contain "Balance:" prefix
    await BrowserPlaygroundDapp.assertResponseValue('Balance:');
  }, DAPP_URL);

  //
  // Reset dapp state
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapDisconnect();
  }, DAPP_URL);
});
