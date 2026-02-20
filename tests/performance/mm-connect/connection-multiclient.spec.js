import { test } from 'appwright';

import { login } from '../../framework/utils/Flows.js';
import {
  launchMobileBrowser,
  switchToMobileBrowser,
  navigateToDapp,
} from '../../framework/utils/MobileBrowser.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import BrowserPlaygroundDapp from '../../../wdio/screen-objects/BrowserPlaygroundDapp.js';
import AndroidScreenHelpers from '../../../wdio/screen-objects/Native/Android.js';
import DappConnectionModal from '../../../wdio/screen-objects/Modals/DappConnectionModal.js';
import SignModal from '../../../wdio/screen-objects/Modals/SignModal.js';
import SolanaSignModal from '../../../wdio/screen-objects/Modals/SolanaSignModal.js';
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
import AppwrightGestures from '../../../tests/framework/AppwrightGestures.ts';
import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';

const DAPP_NAME = 'MetaMask MultiChain API Test Dapp';
const DAPP_PORT = 8090;

// NOTE: This test requires the testing SRP to be used
const ACCOUNT_1_EVM_ADDRESS = '0x19a7Ad8256ab119655f1D758348501d598fC1C94';
const ACCOUNT_1_SOLANA_ADDRESS = '6fr9gpqbsszm6snzsjubu91jwxeduhwnvnkwxqksfwcz';

const ACCOUNT_1_SOLANA_SIGNED_MESSAGE_RESULT = 'TnB0MoNjYOTozLwKcZskdyzYszWHetTLcDskffjqLgQ9nYUbM47JySKpEyTZtA48CdMsPK+erAeId6ayzBoJBQ==';


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
  SignModal.device = device;
  SolanaSignModal.device = device;
  AccountListComponent.device = device;

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

    // Cycle the app to ensure solana accounts are created
    await AppwrightGestures.terminateApp(device);
    await AppwrightGestures.activateApp(device);
    await login(device);
    await WalletMainScreen.isMainWalletViewVisible();
    await WalletMainScreen.tapIdenticon();
    await AccountListComponent.isComponentDisplayed();
    await AccountListComponent.waitForSyncingToComplete();

    await launchMobileBrowser(device);
    await navigateToDapp(device, DAPP_URL, DAPP_NAME);
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  //
  // Connect via Multichain API
  //

  // Tap the Connect button (multichain API - default scopes)
  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      // Note: the Solana wallet standard provider itself has an issue where it does not
      // listen for wallet_sessionChanged events, so we need to use the Solana's connect button
      // as the entrypoint for now.
      await BrowserPlaygroundDapp.tapSolanaConnect();
    },
    DAPP_URL,
  );

  // Handle connection approval in MetaMask
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await switchToMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertMultichainConnected(true);
      await BrowserPlaygroundDapp.assertScopeCardVisible('eip155:1');
      await BrowserPlaygroundDapp.assertScopeCardVisible(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );

      await BrowserPlaygroundDapp.assertConnected(true);
      await BrowserPlaygroundDapp.assertChainIdValue('0x1');
      await BrowserPlaygroundDapp.assertActiveAccount(ACCOUNT_1_EVM_ADDRESS);

      await BrowserPlaygroundDapp.assertWagmiConnected(true);
      await BrowserPlaygroundDapp.assertWagmiChainIdValue('1');
      await BrowserPlaygroundDapp.assertWagmiActiveAccount(
        ACCOUNT_1_EVM_ADDRESS,
      );
      // Verify wagmi personal sign works when wagmi is connected
      await BrowserPlaygroundDapp.typeWagmiSignMessage('Hello MetaMask');
      await BrowserPlaygroundDapp.tapWagmiSignMessage();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapConfirmButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await switchToMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertWagmiSignatureResult('0x');

      await BrowserPlaygroundDapp.assertSolanaConnected(true);
      await BrowserPlaygroundDapp.assertSolanaActiveAccount(
        ACCOUNT_1_SOLANA_ADDRESS,
      );
      // Verify solana sign works when solana is connected
      await BrowserPlaygroundDapp.tapSolanaSignMessage();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SolanaSignModal.tapConfirmButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await switchToMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertSolanaSignedMessageResult(ACCOUNT_1_SOLANA_SIGNED_MESSAGE_RESULT);

      // Test EVM sign (legacy personal sign) when EVM is connected
      await BrowserPlaygroundDapp.tapPersonalSign();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapConfirmButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await switchToMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertResponseValue(
        '0x361c13288b4ab02d50974efddf9e4e7ca651b81c298b614be908c4754abb1dd8328224645a1a8d0fab561c4b855c7bdcebea15db5ae8d1778a1ea791dbd05c2a1b',
      );

      // Disconnect EVM
      await BrowserPlaygroundDapp.tapWagmiDisconnect();

      await BrowserPlaygroundDapp.assertMultichainConnected(true);
      await BrowserPlaygroundDapp.assertScopeCardNotVisible('eip155:1');
      await BrowserPlaygroundDapp.assertScopeCardVisible(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );

      await BrowserPlaygroundDapp.assertConnected(false);
      await BrowserPlaygroundDapp.assertWagmiConnected(false);
      await BrowserPlaygroundDapp.assertSolanaConnected(true);

      // Reconnect EVM
      await BrowserPlaygroundDapp.tapConnectWagmi();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await switchToMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertScopeCardVisible('eip155:1');

      await BrowserPlaygroundDapp.assertConnected(true);
      await BrowserPlaygroundDapp.assertChainIdValue('0x1');
      await BrowserPlaygroundDapp.assertActiveAccount(ACCOUNT_1_EVM_ADDRESS);

      await BrowserPlaygroundDapp.assertWagmiConnected(true);
      await BrowserPlaygroundDapp.assertWagmiChainIdValue('1');
      await BrowserPlaygroundDapp.assertWagmiActiveAccount(
        ACCOUNT_1_EVM_ADDRESS,
      );
      // Verify wagmi personal sign works when wagmi is connected
      await BrowserPlaygroundDapp.typeWagmiSignMessage('Hello MetaMask');
      await BrowserPlaygroundDapp.tapWagmiSignMessage();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapConfirmButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await switchToMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertWagmiSignatureResult('0x');

      // Make sure solana is still connected
      await BrowserPlaygroundDapp.assertScopeCardVisible(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );
      await BrowserPlaygroundDapp.assertSolanaConnected(true);
      await BrowserPlaygroundDapp.assertSolanaActiveAccount(
        ACCOUNT_1_SOLANA_ADDRESS,
      );
      // Verify solana sign works when solana is connected
      await BrowserPlaygroundDapp.tapSolanaSignMessage();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SolanaSignModal.tapConfirmButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await switchToMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertSolanaSignedMessageResult(ACCOUNT_1_SOLANA_SIGNED_MESSAGE_RESULT);

      // Disconnect Solana
      await BrowserPlaygroundDapp.tapSolanaDisconnect();

      await BrowserPlaygroundDapp.assertScopeCardNotVisible(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );
      await BrowserPlaygroundDapp.assertSolanaConnected(false);

      // Make sure EVM is still connected
      await BrowserPlaygroundDapp.assertScopeCardVisible('eip155:1');
      await BrowserPlaygroundDapp.assertConnected(true);
      await BrowserPlaygroundDapp.assertWagmiConnected(true);
      // Verify wagmi personal sign works when wagmi is connected
      await BrowserPlaygroundDapp.typeWagmiSignMessage('Hello MetaMask');
      await BrowserPlaygroundDapp.tapWagmiSignMessage();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapConfirmButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await switchToMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertWagmiSignatureResult('0x');

      // Reconnect Solana
      await BrowserPlaygroundDapp.tapSolanaConnect();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await switchToMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertScopeCardVisible(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );
      await BrowserPlaygroundDapp.assertSolanaConnected(true);
      await BrowserPlaygroundDapp.assertSolanaActiveAccount(
        ACCOUNT_1_SOLANA_ADDRESS,
      );
      // Verify solana sign works when solana is connected
      await BrowserPlaygroundDapp.tapSolanaSignMessage();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SolanaSignModal.tapConfirmButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await switchToMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertSolanaSignedMessageResult(ACCOUNT_1_SOLANA_SIGNED_MESSAGE_RESULT);

      // Make sure EVM is still connected
      await BrowserPlaygroundDapp.assertScopeCardVisible('eip155:1');
      await BrowserPlaygroundDapp.assertConnected(true);
      await BrowserPlaygroundDapp.assertWagmiConnected(true);
      // Verify wagmi personal sign works when wagmi is connected
      await BrowserPlaygroundDapp.typeWagmiSignMessage('Hello MetaMask');
      await BrowserPlaygroundDapp.tapWagmiSignMessage();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapConfirmButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await switchToMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertWagmiSignatureResult('0x');

      // Setup for concurrent connect test

      await BrowserPlaygroundDapp.tapSolanaDisconnect();
      await BrowserPlaygroundDapp.tapWagmiDisconnect();
      await BrowserPlaygroundDapp.tapSolanaConnect();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();

    // Purposely terminate the app without accepting the approval
    await AppwrightGestures.terminateApp(device);
    await AppwrightGestures.activateApp(device);
    await login(device);
    await WalletMainScreen.isMainWalletViewVisible();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await switchToMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.tapConnectWagmi();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await switchToMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertScopeCardVisible('eip155:1');
      await BrowserPlaygroundDapp.assertConnected(true);
      await BrowserPlaygroundDapp.assertWagmiConnected(true);
      // Currently this is only possible if the solana connection attempt (the first one that initiated) was successful.
      await BrowserPlaygroundDapp.assertSolanaConnected(true);
    },
    DAPP_URL,
  );


  //
  // Cleanup - disconnect
  //

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      // Note: the Solana wallet standard provider itself has an issue where it does not
      // listen for wallet_sessionChanged events, so we need to use the Solana's disconnect button
      // to ensure the solana react hook state is reset correctly.
      await BrowserPlaygroundDapp.tapSolanaDisconnect();
      await BrowserPlaygroundDapp.tapDisconnect();
    },
    DAPP_URL,
  );
});
