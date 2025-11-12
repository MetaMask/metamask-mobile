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
import SignModal from '../../../wdio/screen-objects/Modals/SignModal.js';
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
  SignModal.device = device;

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
    // await login(device, { shouldDismissModals: false });
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
      await MultiChainEvmTestDapp.tapPersonalSignButton();
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );

  // Switch back to native context to interact with Android system dialog
  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    // Accept in MetaMask app
    // await login(device, { shouldDismissModals: false });
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
    },
    EVM_LEGACY_TEST_DAPP_URL,
  );
});
