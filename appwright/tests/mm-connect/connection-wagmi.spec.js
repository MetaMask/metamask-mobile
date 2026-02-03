import { test } from 'appwright';

import { login } from '../../utils/Flows.js';
import {
  launchMobileBrowser,
  navigateToDapp,
  refreshMobileBrowser,
} from '../../utils/MobileBrowser.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import BrowserPlaygroundDapp from '../../../wdio/screen-objects/BrowserPlaygroundDapp.js';
import AndroidScreenHelpers from '../../../wdio/screen-objects/Native/Android.js';
import DappConnectionModal from '../../../wdio/screen-objects/Modals/DappConnectionModal.js';
import SignModal from '../../../wdio/screen-objects/Modals/SignModal.js';
import SwitchChainModal from '../../../wdio/screen-objects/Modals/SwitchChainModal.js';
import AddChainModal from '../../../wdio/screen-objects/Modals/AddChainModal.js';
import AppwrightHelpers from '../../../tests/framework/AppwrightHelpers.js';
import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';
import PlaygroundDappServer from './helpers/PlaygroundDappServer.js';

// Local server configuration
const DAPP_PORT = 8090;
const DAPP_NAME = 'MetaMask MultiChain API Test Dapp';

// NOTE: This test requires the testing SRP to be used
const ACCOUNT_1_ADDRESS = '0x19a7Ad8256ab119655f1D758348501d598fC1C94';
const ACCOUNT_3_ADDRESS = '0xE2bEca5CaDC60b61368987728b4229822e6CDa83';

// Start local playground server before all tests
test.beforeAll(async () => {
  await PlaygroundDappServer.start(DAPP_PORT);
});

// Stop local playground server after all tests
test.afterAll(async () => {
  await PlaygroundDappServer.stop();
});

test('@metamask/connect-wagmi - Connect via Wagmi to Local Browser Playground', async ({
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
  SignModal.device = device;
  SwitchChainModal.device = device;
  AddChainModal.device = device;
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
    await launchMobileBrowser(device);
    await navigateToDapp(device, DAPP_URL, DAPP_NAME);
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  //
  // Connect via WAGMI
  //

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.tapConnectWagmi();
    },
    DAPP_URL,
  );

  // Handle connection approval in MetaMask
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
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

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // ============================================================
  // VERIFY CONNECTION AND SIGN MESSAGE
  // ============================================================

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertWagmiConnected(true);
      await BrowserPlaygroundDapp.assertWagmiChainIdValue('1');
      await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_1_ADDRESS);
      // Type a message and sign
      await BrowserPlaygroundDapp.typeWagmiSignMessage('Hello MetaMask');
      await BrowserPlaygroundDapp.tapWagmiSignMessage();
    },
    DAPP_URL,
  );

  // Approve sign request in MetaMask
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Ethereum');
    await SignModal.tapConfirmButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Verify signature result and switch to Sepolia
  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      // Verify we got a signature
      await BrowserPlaygroundDapp.assertWagmiSignatureResult('0x');
      // Switch to Sepolia
      await BrowserPlaygroundDapp.tapWagmiSwitchChain(11155111);
      await BrowserPlaygroundDapp.assertWagmiChainIdValue('11155111');
      // Sign another message on Sepolia
      await BrowserPlaygroundDapp.typeWagmiSignMessage('Hello Sepolia');
      await BrowserPlaygroundDapp.tapWagmiSignMessage();
    },
    DAPP_URL,
  );

  // Cancel sign request
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Sepolia');
    await SignModal.tapCancelButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  //
  // Switch to OP Mainnet (requires approval since unselected earlier)
  //

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.tapWagmiSwitchChain(10); // OP Mainnet
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SwitchChainModal.assertNetworkText('OP');
    await SwitchChainModal.tapConnectButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertWagmiChainIdValue('10');
      await BrowserPlaygroundDapp.typeWagmiSignMessage('Hello OP');
      await BrowserPlaygroundDapp.tapWagmiSignMessage();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('OP');
    await SignModal.tapCancelButton();

    // Wait here to make sure UI is visible before attempted interaction
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Change selected account to Account 3 in MetaMask
    await WalletMainScreen.tapIdenticon();
    await AccountListComponent.isComponentDisplayed();
    await AccountListComponent.tapOnAccountByName('Account 3');
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  //
  // Verify account change and add CELO chain
  //

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_3_ADDRESS);
      // Try to switch to Celo (will trigger add chain)
      await BrowserPlaygroundDapp.tapWagmiSwitchChain(42220);
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await AddChainModal.assertText('42220');
    await AddChainModal.assertText('Celo');
    await AddChainModal.tapConfirmButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertWagmiChainIdValue('42220');
      await BrowserPlaygroundDapp.typeWagmiSignMessage('Hello Celo');
      await BrowserPlaygroundDapp.tapWagmiSignMessage();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Celo');
    await SignModal.tapCancelButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  //
  // Resume from refresh
  //

  await AppwrightHelpers.withNativeAction(device, async () => {
    await refreshMobileBrowser(device);
  });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertWagmiConnected(true);
      // Note: Chain may reset to 1 after refresh
      await BrowserPlaygroundDapp.assertWagmiChainIdValue('1');
      await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_3_ADDRESS);
      await BrowserPlaygroundDapp.typeWagmiSignMessage('After refresh');
      await BrowserPlaygroundDapp.tapWagmiSignMessage();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapCancelButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  //
  // Terminate and connect
  //

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.tapDisconnect();
      await BrowserPlaygroundDapp.assertWagmiConnected(false);
      await BrowserPlaygroundDapp.tapConnectWagmi();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertWagmiConnected(true);
      await BrowserPlaygroundDapp.assertWagmiChainIdValue('1');
      await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_3_ADDRESS);
    },
    DAPP_URL,
  );

  //
  // Wait for incomplete session timeout on refresh and reconnect after
  //

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.tapDisconnect();
      await BrowserPlaygroundDapp.tapConnectWagmi();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    // Purposely not interacting with the approval
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withNativeAction(device, async () => {
    await refreshMobileBrowser(device);
  });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // After timeout, should be disconnected
  await new Promise((resolve) => setTimeout(resolve, 10000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertWagmiConnected(false);
      await BrowserPlaygroundDapp.tapConnectWagmi();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertWagmiConnected(true);
      await BrowserPlaygroundDapp.assertWagmiChainIdValue('1');
      await BrowserPlaygroundDapp.assertWagmiActiveAccount(ACCOUNT_3_ADDRESS);
    },
    DAPP_URL,
  );

  //
  // Reset dapp state
  //

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.tapDisconnect();
    },
    DAPP_URL,
  );
});
