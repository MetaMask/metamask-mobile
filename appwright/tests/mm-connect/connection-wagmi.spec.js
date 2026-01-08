import { test } from 'appwright';

import { login } from '../../utils/flows/Flows.js';
import {
  launchMobileBrowser,
  navigateToDapp,
  refreshMobileBrowser,
} from '../../utils/flows/MobileBrowser.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import WagmiTestDapp from '../../../wdio/screen-objects/WagmiTestDapp.js';
import AndroidScreenHelpers from '../../../wdio/screen-objects/Native/Android.js';
import DappConnectionModal from '../../../wdio/screen-objects/Modals/DappConnectionModal.js';
import SignModal from '../../../wdio/screen-objects/Modals/SignModal.js';
import SwitchChainModal from '../../../wdio/screen-objects/Modals/SwitchChainModal.js';
import AddChainModal from '../../../wdio/screen-objects/Modals/AddChainModal.js';
import AppwrightHelpers from '../../../e2e/framework/AppwrightHelpers.js';
import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';
import AppwrightGestures from '../../../e2e/framework/AppwrightGestures.js';

const WAGMI_TEST_DAPP_URL = 'http://10.0.2.2:5173/';
const WAGMI_TEST_DAPP_NAME = 'React Vite';

test('@metamask/connect-evm (wagmi) - Connect to the Wagmi Test Dapp', async ({
  device,
}) => {
  WalletMainScreen.device = device;
  WagmiTestDapp.device = device;
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

  await AppwrightHelpers.switchToNativeContext(device);

  await AppwrightHelpers.withNativeAction(device, async () => {
    await login(device);
    // commenting this out because we're manually dismissing modals and this check so slow
    // await WalletMainScreen.isMainWalletViewVisible();

    // Launch mobile browser and navigate to the dapp
    await launchMobileBrowser(device);
    await navigateToDapp(device, WAGMI_TEST_DAPP_URL, WAGMI_TEST_DAPP_NAME);
  });

  await AppwrightHelpers.switchToWebViewContext(device, WAGMI_TEST_DAPP_URL);
  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WagmiTestDapp.tapConnectButton();
    },
    WAGMI_TEST_DAPP_URL,
  );

  // Switch back to native context to interact with Android system dialog
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();

    await DappConnectionModal.tapEditAccountsButton();
    await DappConnectionModal.tapAccountButton('Account 3');
    await DappConnectionModal.tapUpdateAccountsButton();
    await DappConnectionModal.tapPermissionsTabButton();
    await DappConnectionModal.tapEditNetworksButton();
    await DappConnectionModal.tapNetworkButton('OP');
    await DappConnectionModal.tapUpdateNetworksButton();
    await DappConnectionModal.tapConnectButton();
  });

  // Explicit pausing to avoid navigating back too fast to the dapp
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await launchMobileBrowser(device);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WagmiTestDapp.isDappConnected();
      await WagmiTestDapp.assertConnectedChainValue('1');
      await WagmiTestDapp.assertConnectedAccountsValue(
        '0x19a7Ad8256ab119655f1D758348501d598fC1C94',
      );
      await WagmiTestDapp.tapPersonalSignButton();
    },
    WAGMI_TEST_DAPP_URL,
  );

  // Switch back to native context to interact with Android system dialog
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    // Accept in MetaMask app
    // await login(device, { dismissModals: false });
    await SignModal.assertNetworkText('Ethereum');
    await SignModal.tapConfirmButton();
  });

  // Explicit pausing to avoid navigating back too fast to the dapp
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await launchMobileBrowser(device);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      // This requires the SRP account to be used
      await WagmiTestDapp.assertPersonalSignResponseValue(
        '0xf6b3f2e43a0c7f1dbfb107b6d687979c8ae21ab7c065fa610bf52f8c579b21292e224e7af93cf16dd2f309de7072b46f11a21e08d76c6c5a3d10ce885e997d4b1b',
      );
      await WagmiTestDapp.tapSwitchChainButton('11155111'); // Sepolia
      await WagmiTestDapp.assertConnectedChainValue('11155111');
      await WagmiTestDapp.tapPersonalSignButton();
    },
    WAGMI_TEST_DAPP_URL,
  );

  // Switch back to native context to interact with Android system dialog
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    // Accept in MetaMask app
    // await login(device, { dismissModals: false });
    await SignModal.assertNetworkText('Sepolia');
    await SignModal.tapCancelButton();
  });

  // Explicit pausing to avoid navigating back too fast to the dapp
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await launchMobileBrowser(device);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WagmiTestDapp.tapSwitchChainButton('10'); // OP Mainnet
    },
    WAGMI_TEST_DAPP_URL,
  );

  // Switch back to native context to interact with Android system dialog
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SwitchChainModal.assertNetworkText('OP');
    await SwitchChainModal.tapConnectButton();
  });

  // Explicit pausing to avoid navigating back too fast to the dapp
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await launchMobileBrowser(device);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WagmiTestDapp.assertConnectedChainValue('10');
      await WagmiTestDapp.tapPersonalSignButton();
    },
    WAGMI_TEST_DAPP_URL,
  );

  // Switch back to native context to interact with Android system dialog
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('OP');
    await SignModal.tapCancelButton();

    // Change to a specific account
    await WalletMainScreen.tapIdenticon();
    await AccountListComponent.isComponentDisplayed(); // Optional: verify modal opened
    await AccountListComponent.tapOnAccountByName('Account 3');
  });

  // Explicit pausing to avoid navigating back too fast to the dapp
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await launchMobileBrowser(device);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WagmiTestDapp.assertConnectedAccountsValue(
        // Account 3 is now the first account connected
        '0xE2bEca5CaDC60b61368987728b4229822e6CDa83',
      );
      await WagmiTestDapp.tapSwitchChainButton('42220'); // Celo
    },
    WAGMI_TEST_DAPP_URL,
  );

  // Switch back to native context to interact with Android system dialog
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    // Accept in MetaMask app
    // await login(device, { dismissModals: false });
    await AddChainModal.assertText('42220');
    await AddChainModal.assertText('Celo');
    await AddChainModal.tapConfirmButton();
  });

  // Explicit pausing to avoid navigating back too fast to the dapp
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await launchMobileBrowser(device);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WagmiTestDapp.assertConnectedChainValue('42220');
      await WagmiTestDapp.tapPersonalSignButton();
    },
    WAGMI_TEST_DAPP_URL,
  );

  // Switch back to native context to interact with Android system dialog
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    // Accept in MetaMask app
    // await login(device, { dismissModals: false });
    await SignModal.assertNetworkText('Celo');
    await SignModal.tapCancelButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await launchMobileBrowser(device);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Resume from refresh

  await AppwrightHelpers.withNativeAction(device, async () => {
    await refreshMobileBrowser(device);
  });

  // Wait for page to initialize
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WagmiTestDapp.isDappConnected();
      // TODO: Determine why the chain resets to 1 after refresh
      await WagmiTestDapp.assertConnectedChainValue('1');
      await WagmiTestDapp.assertConnectedAccountsValue(
        '0xE2bEca5CaDC60b61368987728b4229822e6CDa83',
      );
      await WagmiTestDapp.tapPersonalSignButton();
    },
    WAGMI_TEST_DAPP_URL,
  );

  // Switch back to native context to interact with Android system dialog
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapCancelButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await launchMobileBrowser(device);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Terminate and connect

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WagmiTestDapp.tapDisconnectButton();
      await WagmiTestDapp.assertDappConnectedStatus('disconnected');
      await WagmiTestDapp.assertConnectedChainValue('');
      await WagmiTestDapp.assertConnectedAccountsValue('');
      await WagmiTestDapp.tapConnectButton();
    },
    WAGMI_TEST_DAPP_URL,
  );

  // Switch back to native context to interact with Android system dialog
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton();
  });

  // Explicit pausing to avoid navigating back too fast to the dapp
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await launchMobileBrowser(device);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WagmiTestDapp.isDappConnected();
      await WagmiTestDapp.assertConnectedChainValue('1');
      await WagmiTestDapp.assertConnectedAccountsValue(
        '0xE2bEca5CaDC60b61368987728b4229822e6CDa83',
      );
      await WagmiTestDapp.tapDisconnectButton();
    },
    WAGMI_TEST_DAPP_URL,
  );
});
