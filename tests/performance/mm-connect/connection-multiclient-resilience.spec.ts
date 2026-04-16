import { test } from '../../framework/fixture';

import { loginToAppPlaywright } from '../../flows/wallet.flow';
import BrowserPlaygroundDapp from '../../page-objects/MMConnect/BrowserPlaygroundDapp';
import AndroidScreenHelpers from '../../page-objects/MMConnect/AndroidScreenHelpers';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal';
import SignModal from '../../page-objects/MMConnect/SignModal';
import SnapSignModal from '../../page-objects/MMConnect/SnapSignModal';
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers';
import {
  DappServer,
  DappVariants,
  TestDapps,
  sleep,
  PlaywrightGestures,
  asPlaywrightElement,
} from '../../framework';
import {
  getDappUrlForBrowser,
  setupAdbReverse,
  cleanupAdbReverse,
  ensureAccountGroupsFinishedLoading,
  waitForDappServerReady,
} from './utils';
import {
  launchMobileBrowser,
  navigateToDapp,
  switchToMobileBrowser,
} from '../../flows/native-browser.flow';

const DAPP_PORT = 8090;

// NOTE: This test requires the testing SRP to be used
const ACCOUNT_1_EVM_ADDRESS = '0x19a7Ad8256ab119655f1D758348501d598fC1C94';
const ACCOUNT_1_SOLANA_ADDRESS = '6fr9gpqbsszm6snzsjubu91jwxeduhwnvnkwxqksfwcz';

const SOLANA_MAINNET_CAIP_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

const ACCOUNT_1_SOLANA_SIGNED_MESSAGE_RESULT =
  'TnB0MoNjYOTozLwKcZskdyzYszWHetTLcDskffjqLgQ9nYUbM47JySKpEyTZtA48CdMsPK+erAeId6ayzBoJBQ==';

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

// Test steps (in order):
//
// 1. DISCONNECT SOLANA, VERIFY EVM PERSISTS
//    - Tap Solana disconnect
//    - Assert: solana scope gone, Solana disconnected
//    - Assert: eip155:1 scope still visible, legacy EVM connected, wagmi connected
//    - Wagmi personal sign -> confirm -> assert signature starts with 0x
//
// 2. RECONNECT SOLANA, VERIFY EVM PERSISTS
//    - Tap Solana connect -> approve in MetaMask
//    - Assert: Solana scope visible, Solana connected with account 1
//    - Solana sign message -> confirm -> assert correct signed result
//    - Assert: eip155:1 scope still visible, legacy EVM connected, wagmi connected
//    - Wagmi personal sign -> confirm -> assert signature starts with 0x
//
// 3. CONCURRENT CONNECT: PENDING APPROVAL + KILL APP RESILIENCE
//    - Disconnect both Solana and wagmi, then tap Solana connect (initiates approval)
//    - In MetaMask: terminate app without accepting approval, relaunch and log in
//    - Tap wagmi connect -> approve in MetaMask
//    - Assert: eip155:1 connected, legacy EVM connected, wagmi connected
//    - Assert: Solana connected (the pending Solana session from step 7 was fulfilled)
//
// 4. CLEANUP
//    - Tap Solana disconnect and legacy EVM disconnect
test('@metamask/connect-multichain (multiple clients) - Disconnect, reconnect, and resilience via Multichain API', async ({
  currentDeviceDetails,
  driver,
}) => {
  const platform = currentDeviceDetails.platform;
  const useBrowserStackLocal =
    process.env.BROWSERSTACK_LOCAL?.toLowerCase() === 'true';
  const DAPP_URL = useBrowserStackLocal
    ? `http://bs-local.com:${DAPP_PORT}`
    : getDappUrlForBrowser(platform);

  //
  // Login and navigate to dapp
  // (relies on connection state established by the preceding multiclient test)
  //

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await loginToAppPlaywright();
    await ensureAccountGroupsFinishedLoading(currentDeviceDetails);
    await launchMobileBrowser();
    await navigateToDapp(DAPP_URL);
  });

  // Tap the Connect button (multichain API - default scopes)
  await PlaywrightContextHelpers.withWebAction(async () => {
    // Note: the Solana wallet standard provider itself has an issue where it does not
    // listen for wallet_sessionChanged events, so we need to use the Solana's connect button
    // as the entrypoint for now.
    await BrowserPlaygroundDapp.tapSolanaConnect();
  }, DAPP_URL);

  //
  // Step 5: Disconnect Solana, verify EVM persists
  //
  await PlaywrightContextHelpers.withWebAction(async () => {
    // Disconnect Solana
    await BrowserPlaygroundDapp.tapSolanaDisconnect();

    await BrowserPlaygroundDapp.assertScopeCardNotVisible(
      SOLANA_MAINNET_CAIP_CHAIN_ID,
    );
    await BrowserPlaygroundDapp.assertSolanaConnected(false);

    // Make sure EVM is still connected
    await BrowserPlaygroundDapp.assertScopeCardVisible('eip155:1');
    await BrowserPlaygroundDapp.assertConnected(true);
    await BrowserPlaygroundDapp.assertWagmiConnected(true);
    // Verify wagmi personal sign works when wagmi is connected
    await BrowserPlaygroundDapp.typeWagmiSignMessage('Hello MetaMask');
    await PlaywrightGestures.hideKeyboard();
    await BrowserPlaygroundDapp.tapWagmiSignMessage();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapConfirmButton();
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiSignatureResult('0x');

    // Reconnect Solana
    await BrowserPlaygroundDapp.tapSolanaConnect();
  }, DAPP_URL);

  // Reconnecting Solana takes a bit of time, so we need to wait for it to complete
  await sleep(3500);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton();
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertScopeCardVisible(
      SOLANA_MAINNET_CAIP_CHAIN_ID,
    );
    await BrowserPlaygroundDapp.assertSolanaConnected(true);
    await BrowserPlaygroundDapp.assertSolanaActiveAccount(
      ACCOUNT_1_SOLANA_ADDRESS,
    );
    // Verify solana sign works when solana is connected
    await PlaywrightGestures.scrollIntoView(
      await asPlaywrightElement(BrowserPlaygroundDapp.solanaCard),
      { scrollParams: { direction: 'down' } },
    );
    await BrowserPlaygroundDapp.tapSolanaSignMessage();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SnapSignModal.tapConfirmButton();
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertSolanaSignedMessageResult(
      ACCOUNT_1_SOLANA_SIGNED_MESSAGE_RESULT,
    );

    // Make sure EVM is still connected
    await BrowserPlaygroundDapp.assertScopeCardVisible('eip155:1');
    await BrowserPlaygroundDapp.assertConnected(true);
    await BrowserPlaygroundDapp.assertWagmiConnected(true);
    // Verify wagmi personal sign works when wagmi is connected
    await BrowserPlaygroundDapp.typeWagmiSignMessage('Hello MetaMask');
    await PlaywrightGestures.hideKeyboard();
    await BrowserPlaygroundDapp.tapWagmiSignMessage();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapConfirmButton();
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertWagmiSignatureResult('0x');

    // Setup for concurrent connect test

    await BrowserPlaygroundDapp.tapSolanaDisconnect();
    await BrowserPlaygroundDapp.tapWagmiDisconnect();
    await BrowserPlaygroundDapp.tapSolanaConnect();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();

    // Purposely terminate the app without accepting the approval
    await PlaywrightGestures.terminateApp(currentDeviceDetails);
    await PlaywrightGestures.activateApp(currentDeviceDetails);
    await loginToAppPlaywright();
    await sleep(1000);
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.tapConnectWagmi();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton();
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertScopeCardVisible('eip155:1');
    await BrowserPlaygroundDapp.assertConnected(true);
    await BrowserPlaygroundDapp.assertWagmiConnected(true);
    // Currently this is only possible if the solana connection attempt (the first one that initiated) was successful.
    await BrowserPlaygroundDapp.assertSolanaConnected(true);
  }, DAPP_URL);

  //
  // Cleanup - disconnect
  //

  await PlaywrightContextHelpers.withWebAction(async () => {
    // Note: the Solana wallet standard provider itself has an issue where it does not
    // listen for wallet_sessionChanged events, so we need to use the Solana's disconnect button
    // to ensure the solana react hook state is reset correctly.
    await BrowserPlaygroundDapp.tapSolanaDisconnect();
    await BrowserPlaygroundDapp.tapDisconnect();
  }, DAPP_URL);
});
