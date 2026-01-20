import { test } from 'appwright';

import { login } from '../../utils/Flows.js';
import {
  launchMobileBrowser,
  navigateToDapp,
} from '../../utils/MobileBrowser.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import MultiChainTestDapp from '../../../wdio/screen-objects/MultiChainTestDapp.js';
import MultiChainEvmTestDapp from '../../../wdio/screen-objects/MultiChainEvmTestDapp.js';
import AndroidScreenHelpers from '../../../wdio/screen-objects/Native/Android.js';
import DappConnectionModal from '../../../wdio/screen-objects/Modals/DappConnectionModal.js';
import AppwrightGestures from '../../../e2e/framework/AppwrightGestures.js';

const MULTI_CHAIN_TEST_DAPP_URL = 'http://10.0.2.2:3000/test-dapp-multichain';
const MULTI_CHAIN_TEST_DAPP_NAME = 'Multichain Test Dapp';

test('@metamask/connect-multichain - Connect to the Multichain Test Dapp', async ({
  device,
}) => {
  WalletMainScreen.device = device;
  MultiChainTestDapp.device = device;
  AndroidScreenHelpers.device = device;
  DappConnectionModal.device = device;

  await login(device);
  await WalletMainScreen.isMainWalletViewVisible();

  // Launch mobile browser and navigate to the dapp
  await launchMobileBrowser(device);
  await navigateToDapp(
    device,
    MULTI_CHAIN_TEST_DAPP_URL,
    MULTI_CHAIN_TEST_DAPP_NAME,
  );

  // Connect to the dapp
  await MultiChainTestDapp.tapClearButton();
  await MultiChainTestDapp.tapConnectMMCButton();
  await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();

  // Accept in MetaMask app
  // await login(device, { dismissModals: false });

  await DappConnectionModal.tapConnectButton();

  // Explicit pausing to avoid navigating back too fast to the dapp
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await launchMobileBrowser(device);

  await AppwrightGestures.scrollIntoView(
    device,
    MultiChainTestDapp.connectedChainsHeader,
    {
      scrollParams: {
        percent: 0.2,
      },
    },
  );
  await MultiChainTestDapp.isDappConnected();
});
