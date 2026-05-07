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
  unlockIfLockScreenVisible,
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
// 1. Login and navigate to the local browser playground dapp
//
// 2. INITIAL MULTICHAIN CONNECTION
//    - Tap Solana connect (used as multichain entrypoint due to wallet_sessionChanged limitation)
//    - Approve connection in MetaMask
//    - Assert: multichain connected, eip155:1 scope visible, solana mainnet scope visible
//    - Assert: legacy EVM connected (chainId 0x1, account 1), wagmi connected (chainId 1, account 1)
//    - Wagmi personal sign -> confirm -> assert signature starts with 0x
//    - Assert: Solana connected with account 1
//    - Solana sign message -> confirm via SnapSignModal -> assert correct signed result
//    - Legacy EVM personal sign -> confirm -> assert correct signature
//
// 3. DISCONNECT EVM, VERIFY SOLANA PERSISTS
//    - Tap wagmi disconnect
//    - Assert: multichain still connected, eip155:1 scope gone, solana scope still visible
//    - Assert: legacy EVM disconnected, wagmi disconnected, Solana still connected
//
// 4. RECONNECT EVM, VERIFY SOLANA PERSISTS
//    - Tap wagmi connect -> approve in MetaMask
//    - Assert: eip155:1 scope visible, legacy EVM connected, wagmi connected
//    - Wagmi personal sign -> confirm -> assert signature starts with 0x
//    - Assert: Solana scope still visible, Solana still connected
//    - Solana sign message -> confirm -> assert correct signed result
test('@metamask/connect-multichain (multiple clients) - Connect multiple clients via Multichain API to Local Browser Playground', async ({
  currentDeviceDetails,
}) => {
  // Get platform-specific URL
  const platform = currentDeviceDetails.platform;
  const useBrowserStackLocal =
    process.env.BROWSERSTACK_LOCAL?.toLowerCase() === 'true';
  const DAPP_URL = useBrowserStackLocal
    ? `http://bs-local.com:${DAPP_PORT}`
    : getDappUrlForBrowser(platform);

  //
  // Login and navigate to dapp
  //

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await loginToAppPlaywright();
    await ensureAccountGroupsFinishedLoading(currentDeviceDetails);
    await launchMobileBrowser();
    await navigateToDapp(DAPP_URL);
  });

  await sleep(1000);

  //
  // Connect via Multichain API
  //

  // Tap the Connect button (multichain API - default scopes)
  await PlaywrightContextHelpers.withWebAction(async () => {
    // Note: the Solana wallet standard provider itself has an issue where it does not
    // listen for wallet_sessionChanged events, so we need to use the Solana's connect button
    // as the entrypoint for now.
    await BrowserPlaygroundDapp.tapSolanaConnect();
  }, DAPP_URL);

  // Handle connection approval in MetaMask
  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await unlockIfLockScreenVisible();
    await DappConnectionModal.tapConnectButton();
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertMultichainConnected(true);
    await BrowserPlaygroundDapp.assertScopeCardVisible('eip155:1');
    await BrowserPlaygroundDapp.assertScopeCardVisible(
      SOLANA_MAINNET_CAIP_CHAIN_ID,
    );

    await BrowserPlaygroundDapp.assertConnected(true);
    await BrowserPlaygroundDapp.assertChainIdValue('0x1');
    await BrowserPlaygroundDapp.assertActiveAccount(ACCOUNT_1_EVM_ADDRESS);

    await BrowserPlaygroundDapp.assertWagmiConnected(true);
    await BrowserPlaygroundDapp.assertWagmiChainIdValue('1');
    await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_1_EVM_ADDRESS);
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

    await BrowserPlaygroundDapp.assertSolanaConnected(true);
    await BrowserPlaygroundDapp.assertSolanaActiveAccount(
      ACCOUNT_1_SOLANA_ADDRESS,
    );
    // Verify solana sign works when solana is connected
    await PlaywrightGestures.scrollIntoView(
      await asPlaywrightElement(BrowserPlaygroundDapp.solanaCard),
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

    await PlaywrightGestures.scrollIntoView(
      await asPlaywrightElement(BrowserPlaygroundDapp.legacyEvmCard),
      { scrollParams: { direction: 'down' } },
    );
    // Test EVM sign (legacy personal sign) when EVM is connected
    await BrowserPlaygroundDapp.tapPersonalSign();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapConfirmButton();
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await BrowserPlaygroundDapp.assertResponseValue(
      '0x361c13288b4ab02d50974efddf9e4e7ca651b81c298b614be908c4754abb1dd8328224645a1a8d0fab561c4b855c7bdcebea15db5ae8d1778a1ea791dbd05c2a1b',
    );

    // Disconnect EVM
    await PlaywrightGestures.scrollIntoView(
      await asPlaywrightElement(BrowserPlaygroundDapp.wagmiDisconnectButton),
    );
    await BrowserPlaygroundDapp.tapWagmiDisconnect();

    await PlaywrightGestures.scrollIntoView(
      await asPlaywrightElement(BrowserPlaygroundDapp.connectedScopesSection),
      { scrollParams: { direction: 'down' } },
    );
    await BrowserPlaygroundDapp.assertMultichainConnected(true);
    await BrowserPlaygroundDapp.assertScopeCardNotVisible('eip155:1');
    await BrowserPlaygroundDapp.assertScopeCardVisible(
      SOLANA_MAINNET_CAIP_CHAIN_ID,
    );

    await BrowserPlaygroundDapp.assertConnected(false);
    await BrowserPlaygroundDapp.assertWagmiConnected(false);
    await BrowserPlaygroundDapp.assertSolanaConnected(true);

    // Reconnect EVM
    await PlaywrightGestures.scrollIntoView(
      await asPlaywrightElement(BrowserPlaygroundDapp.connectWagmiButton),
      { scrollParams: { direction: 'down' } },
    );
    await BrowserPlaygroundDapp.tapConnectWagmi();
  }, DAPP_URL);

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton({ shouldCooldown: true });
  });

  await sleep(1000);
  await switchToMobileBrowser();
  await sleep(1000);

  await PlaywrightContextHelpers.withWebAction(async () => {
    await PlaywrightGestures.scrollIntoView(
      await asPlaywrightElement(BrowserPlaygroundDapp.wagmiCard),
      { scrollParams: { direction: 'up' } },
    );

    await BrowserPlaygroundDapp.assertScopeCardVisible('eip155:1');

    await BrowserPlaygroundDapp.assertConnected(true);
    await BrowserPlaygroundDapp.assertChainIdValue('0x1');
    await BrowserPlaygroundDapp.assertActiveAccount(ACCOUNT_1_EVM_ADDRESS);

    await BrowserPlaygroundDapp.assertWagmiConnected(true);
    await BrowserPlaygroundDapp.assertWagmiChainIdValue('1');
    await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_1_EVM_ADDRESS);
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

    // Make sure solana is still connected
    await BrowserPlaygroundDapp.assertScopeCardVisible(
      SOLANA_MAINNET_CAIP_CHAIN_ID,
    );
    await BrowserPlaygroundDapp.assertSolanaConnected(true);
    await BrowserPlaygroundDapp.assertSolanaActiveAccount(
      ACCOUNT_1_SOLANA_ADDRESS,
    );
    // Verify solana sign works when solana is connected
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
    await PlaywrightGestures.scrollIntoView(
      await asPlaywrightElement(
        BrowserPlaygroundDapp.solanaSignedMessageResult,
      ),
    );
    await BrowserPlaygroundDapp.assertSolanaSignedMessageResult(
      ACCOUNT_1_SOLANA_SIGNED_MESSAGE_RESULT,
    );
  }, DAPP_URL);
});
