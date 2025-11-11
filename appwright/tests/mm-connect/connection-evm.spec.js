import { test } from 'appwright';

import { login } from '../../utils/flows/Flows.js';
import {
  launchMobileBrowser,
  navigateToDapp,
} from '../../utils/flows/MobileBrowser.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import MultiChainEvmTestDapp from '../../../wdio/screen-objects/MultiChainEvmTestDapp.js';
import AndroidScreenHelpers from '../../../wdio/screen-objects/Native/Android.js';
import DappConnectionModal from '../../../wdio/screen-objects/Modals/DappConnectionModal.js';
import AppwrightHelpers from '../../../e2e/framework/AppwrightHelpers.js';

const EVM_LEGACY_TEST_DAPP_URL = 'http://10.0.2.2:5173/';
const EVM_LEGACY_TEST_DAPP_NAME = 'Connect | Legacy EVM';

test('@metamask/connect-evm - Connect to the EVM Legacy Test Dapp', async ({
  device,
}) => {
  WalletMainScreen.device = device;
  MultiChainEvmTestDapp.device = device;
  AndroidScreenHelpers.device = device;
  DappConnectionModal.device = device;

  await AppwrightHelpers.switchToNativeContext(device);

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

  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Connect to the dapp
  // This might make things worse?
  // await MultiChainEvmTestDapp.tapTerminateButton();

  await AppwrightHelpers.switchToWebViewContext(
    device,
    EVM_LEGACY_TEST_DAPP_URL,
  );
  await MultiChainEvmTestDapp.tapConnectButton();

  await AppwrightHelpers.switchToNativeContext(device);
  await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();

  // Accept in MetaMask app
  // await login(device, { shouldDismissModals: false });

  await DappConnectionModal.tapConnectButton();

  // Explicit pausing to avoid navigating back too fast to the dapp
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await launchMobileBrowser(device);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.switchToWebViewContext(
    device,
    EVM_LEGACY_TEST_DAPP_URL,
  );
  await MultiChainEvmTestDapp.isDappConnected();
});
