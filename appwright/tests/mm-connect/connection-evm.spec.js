import { test } from 'appwright';

import { login } from '../../utils/flows/Flows.js';
import {
  launchMobileBrowser,
  navigateToDapp,
  refreshMobileBrowser,
} from '../../utils/flows/MobileBrowser.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import MultiChainEvmTestDapp from '../../../wdio/screen-objects/MultiChainEvmTestDapp.js';
import AndroidScreenHelpers from '../../../wdio/screen-objects/Native/Android.js';
import DappConnectionModal from '../../../wdio/screen-objects/Modals/DappConnectionModal.js';
import SignModal from '../../../wdio/screen-objects/Modals/SignModal.js';
import SwitchChainModal from '../../../wdio/screen-objects/Modals/SwitchChainModal.js';
import AppwrightHelpers from '../../../e2e/framework/AppwrightHelpers.js';
import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';
import AppwrightGestures from '../../../e2e/framework/AppwrightGestures.js';

const EVM_LEGACY_TEST_DAPP_URL = 'http://bs-local.com:5173/';
const EVM_LEGACY_TEST_DAPP_NAME = 'Connect | Legacy EVM';

test.skip('@metamask/connect-evm - Connect to the EVM Legacy Test Dapp', async ({
  device,
}) => {
  WalletMainScreen.device = device;
  MultiChainEvmTestDapp.device = device;
  AndroidScreenHelpers.device = device;
  DappConnectionModal.device = device;
  SignModal.device = device;
  SwitchChainModal.device = device;
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
    await navigateToDapp(
      device,
      EVM_LEGACY_TEST_DAPP_URL,
      EVM_LEGACY_TEST_DAPP_NAME,
    );
  });
  // commenting this out because we're manually dismissing modals and this check so slow
  // await WalletMainScreen.isMainWalletViewVisible();

  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Connect to the dapp
  // This might make things worse?
  // await MultiChainEvmTestDapp.tapTerminateButton();

  await AppwrightHelpers.switchToWebViewContext(
    device,
    EVM_LEGACY_TEST_DAPP_URL,
  );
  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await MultiChainEvmTestDapp.tapConnectButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  // Switch back to native context to interact with Android system dialog
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    // Accept in MetaMask app
    // await login(device, { dismissModals: false });
    await DappConnectionModal.tapEditAccountsButton();
    await DappConnectionModal.tapAccountButton('Account 3');
    await DappConnectionModal.tapUpdateAccountsButton();
    await DappConnectionModal.tapConnectButton();
  });

  // Explicit pausing to avoid navigating back too fast to the dapp
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await launchMobileBrowser(device);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await MultiChainEvmTestDapp.isDappConnected();
      await MultiChainEvmTestDapp.assertConnectedChainValue('0x1');
      await MultiChainEvmTestDapp.assertConnectedAccountsValue(
        '0x19a7ad8256ab119655f1d758348501d598fc1c94,0xe2beca5cadc60b61368987728b4229822e6cda83',
      ); // 2 accounts connected
      await MultiChainEvmTestDapp.tapPersonalSignButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  // Switch back to native context to interact with Android system dialog
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    // Accept in MetaMask app
    // await login(device, { dismissModals: false });
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
      await MultiChainEvmTestDapp.assertRequestResponseValue(
        '0x361c13288b4ab02d50974efddf9e4e7ca651b81c298b614be908c4754abb1dd8328224645a1a8d0fab561c4b855c7bdcebea15db5ae8d1778a1ea791dbd05c2a1b',
      );
      await MultiChainEvmTestDapp.tapSendTransactionButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  // Switch back to native context to interact with Android system dialog
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    // Accept in MetaMask app
    // await login(device, { dismissModals: false });
    await SignModal.assertNetworkText('Ethereum');
    await SignModal.tapCancelButton();
  });

  // Explicit pausing to avoid navigating back too fast to the dapp
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await launchMobileBrowser(device);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      // This requires the SRP account to be used
      await MultiChainEvmTestDapp.assertRequestResponseValue(
        'User denied transaction signature.',
      );
      await MultiChainEvmTestDapp.tapSwitchToPolygonButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  // Switch back to native context to interact with Android system dialog
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    // Accept in MetaMask app
    // await login(device, { dismissModals: false });
    await SwitchChainModal.assertNetworkText('Polygon');
    await SwitchChainModal.tapConnectButton();
  });

  // Explicit pausing to avoid navigating back too fast to the dapp
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await launchMobileBrowser(device);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      // This requires the SRP account to be used
      await MultiChainEvmTestDapp.assertConnectedChainValue('0x89');
      await MultiChainEvmTestDapp.tapSendTransactionButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  // Switch back to native context to interact with Android system dialog
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    // Accept in MetaMask app
    // await login(device, { dismissModals: false });
    await SignModal.assertNetworkText('Polygon');
    await SignModal.tapCancelButton();
  });

  // Explicit pausing to avoid navigating back too fast to the dapp
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await launchMobileBrowser(device);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await MultiChainEvmTestDapp.tapSwitchToEthereumMainnetButton();
      await MultiChainEvmTestDapp.assertConnectedChainValue('0x1');
      await MultiChainEvmTestDapp.tapSendTransactionButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  // Switch back to native context to interact with Android system dialog
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    // Accept in MetaMask app
    // await login(device, { dismissModals: false });
    await SignModal.assertNetworkText('Ethereum');
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
      await MultiChainEvmTestDapp.assertConnectedAccountsValue(
        // Account 3 is now the first account connected
        // Note that this is checksummed but the initial connection is not checksummed. Fix this
        '0xE2bEca5CaDC60b61368987728b4229822e6CDa83,0x19a7ad8256ab119655f1d758348501d598fc1c94',
      );
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  // Resume from refresh

  await AppwrightHelpers.withNativeAction(device, async () => {
    await refreshMobileBrowser(device);
  });

  // Wait for page to initialize
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      // TODO: determine why the legacy evm test dapp needs this but the wagmi test dapp does not
      await MultiChainEvmTestDapp.tapConnectButton(); // Not sure why this is needed right now

      await MultiChainEvmTestDapp.isDappConnected();
      await MultiChainEvmTestDapp.assertConnectedChainValue('0x1');
      await MultiChainEvmTestDapp.assertConnectedAccountsValue(
        // Account 3 is now the first account connected
        // Note that this is checksummed but the initial connection is not checksummed. Fix this
        '0xE2bEca5CaDC60b61368987728b4229822e6CDa83,0x19a7ad8256ab119655f1d758348501d598fc1c94',
      );
      await MultiChainEvmTestDapp.assertRequestResponseValue(''); // Make this better
      await MultiChainEvmTestDapp.tapPersonalSignButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  // Switch back to native context to interact with Android system dialog
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapCancelButton();
  });

  // Explicit pausing to avoid navigating back too fast to the dapp
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await launchMobileBrowser(device);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await MultiChainEvmTestDapp.assertRequestResponseValue(
        'User rejected the request.',
      );
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  // Terminate and connect

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await MultiChainEvmTestDapp.tapTerminateButton();
      await MultiChainEvmTestDapp.assertDappConnected('false');
      await MultiChainEvmTestDapp.assertConnectedAccountsValue(''); // Make this better
      // TODO: check chain value when fixed
      await MultiChainEvmTestDapp.tapConnectButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
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
      await MultiChainEvmTestDapp.isDappConnected();
      await MultiChainEvmTestDapp.assertConnectedChainValue('0x1');
      await MultiChainEvmTestDapp.assertConnectedAccountsValue(
        '0xe2beca5cadc60b61368987728b4229822e6cda83', // Account 3 because it's the currently selected account
      );

      // Wait a little longer to be sure the relay is connected??
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await MultiChainEvmTestDapp.tapPersonalSignButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  // Switch back to native context to interact with Android system dialog
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapCancelButton();
  });

  // Explicit pausing to avoid navigating back too fast to the dapp
  await new Promise((resolve) => setTimeout(resolve, 5000));

  await launchMobileBrowser(device);

  await new Promise((resolve) => setTimeout(resolve, 5000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await MultiChainEvmTestDapp.assertRequestResponseValue(
        'User rejected the request.',
      );
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  // Read-only method should hit rpc endpoint instead of wallet
  await AppwrightGestures.terminateApp(device);

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await MultiChainEvmTestDapp.tapEthGetBalanceButton();
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await MultiChainEvmTestDapp.assertRequestResponseValue('0x0');
      await MultiChainEvmTestDapp.tapTerminateButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );
});
