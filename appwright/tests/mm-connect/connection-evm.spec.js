import { test } from 'appwright';

import { login } from '../../utils/Flows.js';
import {
  launchMobileBrowser,
  navigateToDapp,
  refreshMobileBrowser,
} from '../../utils/MobileBrowser.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import MultiChainEvmTestDapp from '../../../wdio/screen-objects/MultiChainEvmTestDapp.js';
import AndroidScreenHelpers from '../../../wdio/screen-objects/Native/Android.js';
import DappConnectionModal from '../../../wdio/screen-objects/Modals/DappConnectionModal.js';
import SignModal from '../../../wdio/screen-objects/Modals/SignModal.js';
import SwitchChainModal from '../../../wdio/screen-objects/Modals/SwitchChainModal.js';
import AppwrightHelpers from '../../../e2e/framework/AppwrightHelpers.js';
import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';
import AppwrightGestures from '../../../e2e/framework/AppwrightGestures.js';

const EVM_LEGACY_TEST_DAPP_URL =
  'https://metamask.github.io/connect-monorepo/legacy-evm-e2e/';
const EVM_LEGACY_TEST_DAPP_NAME = 'Connect | Legacy EVM';
// NOTE: This test requires the testing SRP to be used
const ACCOUNT_1_ADDRESS = '0x19a7Ad8256ab119655f1D758348501d598fC1C94';
const ACCOUNT_3_ADDRESS = '0xE2bEca5CaDC60b61368987728b4229822e6CDa83';

test('@metamask/connect-evm - Connect to the EVM Legacy Test Dapp', async ({
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

  await AppwrightHelpers.withNativeAction(device, async () => {
    await login(device);
    await launchMobileBrowser(device);
    await navigateToDapp(
      device,
      EVM_LEGACY_TEST_DAPP_URL,
      EVM_LEGACY_TEST_DAPP_NAME,
    );
  });
  await new Promise((resolve) => setTimeout(resolve, 5000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await MultiChainEvmTestDapp.tapConnectButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapEditAccountsButton();
    await DappConnectionModal.tapAccountButton('Account 3');
    await DappConnectionModal.tapUpdateAccountsButton();
    await DappConnectionModal.tapConnectButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await MultiChainEvmTestDapp.isDappConnected();
      await MultiChainEvmTestDapp.assertConnectedChainValue('0x1');
      await MultiChainEvmTestDapp.assertConnectedAccountsValue(
        `${ACCOUNT_1_ADDRESS.toLowerCase()},${ACCOUNT_3_ADDRESS.toLowerCase()}`,
      );
      await MultiChainEvmTestDapp.tapPersonalSignButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapConfirmButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await MultiChainEvmTestDapp.assertRequestResponseValue(
        // Account 1 signed the message
        '0x361c13288b4ab02d50974efddf9e4e7ca651b81c298b614be908c4754abb1dd8328224645a1a8d0fab561c4b855c7bdcebea15db5ae8d1778a1ea791dbd05c2a1b',
      );
      await MultiChainEvmTestDapp.tapSendTransactionButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Ethereum');
    await SignModal.tapCancelButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await MultiChainEvmTestDapp.assertRequestResponseValue(
        'User denied transaction signature.',
      );
      await MultiChainEvmTestDapp.tapSwitchToPolygonButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SwitchChainModal.assertNetworkText('Polygon');
    await SwitchChainModal.tapConnectButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await MultiChainEvmTestDapp.assertConnectedChainValue('0x89');
      await MultiChainEvmTestDapp.tapSendTransactionButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Polygon');
    await SignModal.tapCancelButton();
  });

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

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Ethereum');
    await SignModal.tapCancelButton();

    // Change selected account to Account 3
    await WalletMainScreen.tapIdenticon();
    await AccountListComponent.isComponentDisplayed();
    await AccountListComponent.tapOnAccountByName('Account 3');
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await MultiChainEvmTestDapp.assertConnectedAccountsValue(
        // Note that this is checksummed but the initial connection is not checksummed. Fix this
        `${ACCOUNT_3_ADDRESS},${ACCOUNT_1_ADDRESS.toLowerCase()}`,
      );
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

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
      await MultiChainEvmTestDapp.isDappConnected();
      await MultiChainEvmTestDapp.assertConnectedChainValue('0x1');
      await MultiChainEvmTestDapp.assertConnectedAccountsValue(
        // Note that this is checksummed but the initial connection is not checksummed. Fix this
        `${ACCOUNT_3_ADDRESS},${ACCOUNT_1_ADDRESS.toLowerCase()}`,
      );
      await MultiChainEvmTestDapp.assertRequestResponseValue(''); // Make this better
      await MultiChainEvmTestDapp.tapPersonalSignButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapCancelButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      // Validate that responses for requests other than the initial connection request
      // can be received by the dapp still
      await MultiChainEvmTestDapp.assertRequestResponseValue(
        'User rejected the request.',
      );
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  //
  // Terminate and connect
  //

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
      await MultiChainEvmTestDapp.isDappConnected();
      await MultiChainEvmTestDapp.assertConnectedChainValue('0x1');
      await MultiChainEvmTestDapp.assertConnectedAccountsValue(
        ACCOUNT_3_ADDRESS.toLowerCase(),
      );
      await MultiChainEvmTestDapp.tapPersonalSignButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapCancelButton();
  });

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

  //
  // Wait for incomplete session timeout on refresh and reconnect after
  //

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await MultiChainEvmTestDapp.tapTerminateButton();
      await MultiChainEvmTestDapp.tapConnectButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
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

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await MultiChainEvmTestDapp.assertDappConnected('false');
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  await new Promise((resolve) => setTimeout(resolve, 10000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await MultiChainEvmTestDapp.assertDappConnected('false'); // should still be false
      await MultiChainEvmTestDapp.tapConnectButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
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
      await MultiChainEvmTestDapp.isDappConnected();
      await MultiChainEvmTestDapp.assertConnectedChainValue('0x1');
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  //
  // Read-only method should hit rpc endpoint instead of wallet
  //

  await AppwrightGestures.terminateApp(device);
  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await MultiChainEvmTestDapp.tapEthGetBalanceButton();
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await MultiChainEvmTestDapp.assertRequestResponseValue('0x0');
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  //
  // Reset dapp state
  //

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await MultiChainEvmTestDapp.tapTerminateButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );
});
