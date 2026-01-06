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

    // await DappConnectionModal.tapEditAccountsButton();
    // await DappConnectionModal.tapAccountButton('Account 3');
    // await DappConnectionModal.tapUpdateButton();
    await DappConnectionModal.tapConnectButton();
  });
});
