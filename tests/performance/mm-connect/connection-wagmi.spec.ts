import { test } from '../../framework/fixture';
import TimerHelper from '../../framework/TimerHelper';

import { loginToAppPlaywright } from '../../flows/wallet.flow';
import {
  launchMobileBrowser,
  navigateToDapp,
  refreshMobileBrowser,
  switchToMobileBrowser,
} from '../../framework/utils/MobileBrowser';
import WalletView from '../../page-objects/wallet/WalletView';
import BrowserPlaygroundDapp from '../../page-objects/MMConnect/BrowserPlaygroundDapp';
import AndroidScreenHelpers from '../../page-objects/MMConnect/AndroidScreenHelpers';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal';
import SignModal from '../../page-objects/MMConnect/SignModal';
import SwitchChainModal from '../../page-objects/MMConnect/SwitchChainModal';
import AddChainModal from '../../page-objects/MMConnect/AddChainModal';
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import { DappServer, DappVariants, TestDapps, sleep } from '../../framework';
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

test.skip('@metamask/connect-evm (wagmi) - Connect via Wagmi to Local Browser Playground', async ({
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
    'Time from tapping Connect (Wagmi) to dapp confirming Wagmi connected state',
    { ios: 20000, android: 30000 },
    currentDeviceDetails.platform,
  );
  const signTimer = new TimerHelper(
    'Time from tapping Wagmi Sign Message to dapp displaying signature result',
    { ios: 12000, android: 18000 },
    currentDeviceDetails.platform,
  );
  const switchChainTimer = new TimerHelper(
    'Time from tapping Switch Chain to OP Mainnet to dapp confirming chain ID 10',
    { ios: 12000, android: 18000 },
    currentDeviceDetails.platform,
  );
  const refreshReconnectTimer = new TimerHelper(
    'Time from refreshing browser to dapp confirming Wagmi still connected',
    { ios: 8000, android: 12000 },
    currentDeviceDetails.platform,
  );
  const reconnectTimer = new TimerHelper(
    'Time from tapping Connect (Wagmi) after disconnect to dapp confirming reconnected',
    { ios: 20000, android: 30000 },
    currentDeviceDetails.platform,
  );

  //
  // Login and navigate to dapp
  //

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await loginToAppPlaywright();
    await ensureAccountGroupsFinishedLoading(currentDeviceDetails);
    await launchMobileBrowser(driver);
    await navigateToDapp(driver, DAPP_URL, DAPP_NAME);
  });

  await sleep(5000);

  //
  // Connect via WAGMI
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    connectTimer.start();
    await BrowserPlaygroundDapp.tapConnectWagmi();
  }, DAPP_URL);

  // Handle connection approval in MetaMask
  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await unlockIfLockScreenVisible();
    await DappConnectionModal.tapEditAccountsButton();
    // Select account 3 in addition to Account 1
    await DappConnectionModal.tapAccountButton('Account 3');
    await DappConnectionModal.tapUpdateAccountsButton();
    await DappConnectionModal.tapPermissionsTabButton();
    // Unselect OP Mainnet
    await DappConnectionModal.tapEditNetworksButton();
    await DappConnectionModal.tapNetworkButton('OP');
    await DappConnectionModal.tapUpdateNetworksButton();
    await DappConnectionModal.tapConnectButton();
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  // ============================================================
  // VERIFY CONNECTION AND SIGN MESSAGE
  // ============================================================

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiConnected(true);
    connectTimer.stop();
    await BrowserPlaygroundDapp.assertWagmiChainIdValue('1');
    await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_1_ADDRESS);
    // Type a message and sign
    await BrowserPlaygroundDapp.typeWagmiSignMessage('Hello MetaMask');
    signTimer.start();
    await BrowserPlaygroundDapp.tapWagmiSignMessage();
  }, DAPP_URL);

  // Approve sign request in MetaMask
  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Ethereum');
    await SignModal.tapConfirmButton();
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  // Verify signature result and switch to Sepolia
  await PlaywrightContextHelpers.withWebAction(async () => {
    // Verify we got a signature
    await BrowserPlaygroundDapp.assertWagmiSignatureResult('0x');
    signTimer.stop();
    // Switch to Sepolia
    await BrowserPlaygroundDapp.tapWagmiSwitchChain(11155111);
    await BrowserPlaygroundDapp.assertWagmiChainIdValue('11155111');
    // Sign another message on Sepolia
    await BrowserPlaygroundDapp.typeWagmiSignMessage('Hello Sepolia');
    await BrowserPlaygroundDapp.tapWagmiSignMessage();
  }, DAPP_URL);

  // Cancel sign request
  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Sepolia');
    await SignModal.tapCancelButton();
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  //
  // Switch to OP Mainnet (requires approval since unselected earlier)
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    switchChainTimer.start();
    await BrowserPlaygroundDapp.tapWagmiSwitchChain(10); // OP Mainnet
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SwitchChainModal.assertNetworkText('OP');
    await SwitchChainModal.tapConnectButton();
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiChainIdValue('10');
    switchChainTimer.stop();
    await BrowserPlaygroundDapp.typeWagmiSignMessage('Hello OP');
    await BrowserPlaygroundDapp.tapWagmiSignMessage();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('OP');
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

  //
  // Verify account change and add CELO chain
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_3_ADDRESS);
    // Try to switch to Celo (will trigger add chain)
    await BrowserPlaygroundDapp.tapWagmiSwitchChain(42220);
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await AddChainModal.assertText('42220');
    await AddChainModal.assertText('Celo');
    await AddChainModal.tapConfirmButton();
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiChainIdValue('42220');
    await BrowserPlaygroundDapp.typeWagmiSignMessage('Hello Celo');
    await BrowserPlaygroundDapp.tapWagmiSignMessage();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Celo');
    await SignModal.tapCancelButton();
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  //
  // Resume from refresh
  //

  await PlaywrightContextHelpers.withNativeAction(async () => {
    refreshReconnectTimer.start();
    await refreshMobileBrowser(driver);
  });
  await sleep(2000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiConnected(true);
    refreshReconnectTimer.stop();
    // Note: Chain may reset to 1 after refresh
    await BrowserPlaygroundDapp.assertWagmiChainIdValue('1');
    await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_3_ADDRESS);
    await BrowserPlaygroundDapp.typeWagmiSignMessage('After refresh');
    await BrowserPlaygroundDapp.tapWagmiSignMessage();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapCancelButton();
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  //
  // Terminate and connect
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapDisconnect();
    await BrowserPlaygroundDapp.assertWagmiConnected(false);
    reconnectTimer.start();
    await BrowserPlaygroundDapp.tapConnectWagmi();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton();
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiConnected(true);
    reconnectTimer.stop();
    await BrowserPlaygroundDapp.assertWagmiChainIdValue('1');
    await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_3_ADDRESS);
  }, DAPP_URL);

  //
  // Wait for incomplete session timeout on refresh and reconnect after
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapDisconnect();
    await BrowserPlaygroundDapp.tapConnectWagmi();
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

  // After timeout, should be disconnected
  await sleep(10000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiConnected(false);
    await BrowserPlaygroundDapp.tapConnectWagmi();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton();
  });

  await sleep(1000);
  await switchToMobileBrowser(driver);
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiConnected(true);
    await BrowserPlaygroundDapp.assertWagmiChainIdValue('1');
    await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_3_ADDRESS);
  }, DAPP_URL);

  performanceTracker.addTimers(
    connectTimer,
    signTimer,
    switchChainTimer,
    refreshReconnectTimer,
    reconnectTimer,
  );

  //
  // Reset dapp state
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapDisconnect();
  }, DAPP_URL);
});
