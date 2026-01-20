import { test } from 'appwright';

import { login } from '../../utils/Flows.js';
import {
  launchMobileBrowser,
  navigateToDapp,
  refreshMobileBrowser,
} from '../../utils/MobileBrowser.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import WagmiTestDapp from '../../../wdio/screen-objects/WagmiTestDapp.js';
import AndroidScreenHelpers from '../../../wdio/screen-objects/Native/Android.js';
import DappConnectionModal from '../../../wdio/screen-objects/Modals/DappConnectionModal.js';
import SignModal from '../../../wdio/screen-objects/Modals/SignModal.js';
import SwitchChainModal from '../../../wdio/screen-objects/Modals/SwitchChainModal.js';
import AddChainModal from '../../../wdio/screen-objects/Modals/AddChainModal.js';
import AppwrightHelpers from '../../../e2e/framework/AppwrightHelpers.js';
import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';

const WAGMI_TEST_DAPP_URL =
  'https://metamask.github.io/connect-monorepo/wagmi-e2e/';
const WAGMI_TEST_DAPP_NAME = 'React Vite';
// NOTE: This test requires the testing SRP to be used
const ACCOUNT_1_ADDRESS = '0x19a7Ad8256ab119655f1D758348501d598fC1C94';
const ACCOUNT_3_ADDRESS = '0xE2bEca5CaDC60b61368987728b4229822e6CDa83';

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

  await AppwrightHelpers.withNativeAction(device, async () => {
    await login(device);
    await launchMobileBrowser(device);
    await navigateToDapp(device, WAGMI_TEST_DAPP_URL, WAGMI_TEST_DAPP_NAME);
  });

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WagmiTestDapp.tapConnectButton();
    },
    WAGMI_TEST_DAPP_URL,
  );

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

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WagmiTestDapp.isDappConnected();
      await WagmiTestDapp.assertConnectedChainValue('1');
      await WagmiTestDapp.assertConnectedAccountsValue(ACCOUNT_1_ADDRESS);
      await WagmiTestDapp.tapPersonalSignButton();
    },
    WAGMI_TEST_DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Ethereum');
    await SignModal.tapConfirmButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WagmiTestDapp.assertPersonalSignResponseValue(
        '0xf6b3f2e43a0c7f1dbfb107b6d687979c8ae21ab7c065fa610bf52f8c579b21292e224e7af93cf16dd2f309de7072b46f11a21e08d76c6c5a3d10ce885e997d4b1b',
      );
      await WagmiTestDapp.tapSwitchChainButton('11155111'); // Sepolia
      await WagmiTestDapp.assertConnectedChainValue('11155111');
      await WagmiTestDapp.tapPersonalSignButton();
    },
    WAGMI_TEST_DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Sepolia');
    await SignModal.tapCancelButton();
  });

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
      await WagmiTestDapp.assertConnectedChainValue('10');
      await WagmiTestDapp.tapPersonalSignButton();
    },
    WAGMI_TEST_DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('OP');
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
      await WagmiTestDapp.assertConnectedAccountsValue(ACCOUNT_3_ADDRESS);
      await WagmiTestDapp.tapSwitchChainButton('42220'); // Celo
    },
    WAGMI_TEST_DAPP_URL,
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
      await WagmiTestDapp.assertConnectedChainValue('42220');
      await WagmiTestDapp.tapPersonalSignButton();
    },
    WAGMI_TEST_DAPP_URL,
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
      await WagmiTestDapp.isDappConnected();
      // TODO: Determine why the chain resets to 1 after refresh
      await WagmiTestDapp.assertConnectedChainValue('1');
      await WagmiTestDapp.assertConnectedAccountsValue(ACCOUNT_3_ADDRESS);
      await WagmiTestDapp.tapPersonalSignButton();
    },
    WAGMI_TEST_DAPP_URL,
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
      await WagmiTestDapp.tapDisconnectButton();
      await WagmiTestDapp.assertDappConnectedStatus('disconnected');
      await WagmiTestDapp.assertConnectedChainValue('');
      await WagmiTestDapp.assertConnectedAccountsValue('');
      await WagmiTestDapp.tapConnectButton();
    },
    WAGMI_TEST_DAPP_URL,
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
      await WagmiTestDapp.isDappConnected();
      await WagmiTestDapp.assertConnectedChainValue('1');
      await WagmiTestDapp.assertConnectedAccountsValue(ACCOUNT_3_ADDRESS);
    },
    WAGMI_TEST_DAPP_URL,
  );

  //
  // Wait for incomplete session timeout on refresh and reconnect after
  //

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WagmiTestDapp.tapDisconnectButton();
      await WagmiTestDapp.tapConnectButton();
    },
    WAGMI_TEST_DAPP_URL,
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
      await WagmiTestDapp.assertDappConnectedStatus('connecting');
    },
    WAGMI_TEST_DAPP_URL,
  );

  await new Promise((resolve) => setTimeout(resolve, 10000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WagmiTestDapp.assertDappConnectedStatus('disconnected');
      await WagmiTestDapp.tapConnectButton();
    },
    WAGMI_TEST_DAPP_URL,
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
      await WagmiTestDapp.isDappConnected();
      await WagmiTestDapp.assertConnectedChainValue('1');
      await WagmiTestDapp.assertConnectedAccountsValue(ACCOUNT_3_ADDRESS);
    },
    WAGMI_TEST_DAPP_URL,
  );

  //
  // Reset dapp state
  //

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WagmiTestDapp.tapDisconnectButton();
    },
    WAGMI_TEST_DAPP_URL,
  );
});
