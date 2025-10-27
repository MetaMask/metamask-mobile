import { test } from 'appwright';

import { login } from '../../utils/flows/Flows.js';
import {
  launchMobileBrowser,
  navigateToDapp,
} from '../../utils/flows/MobileBrowser.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import MultiChainTestDapp from '../../../wdio/screen-objects/MultiChainTestDapp.js';

test('@metamask/sdk-connect - Connect to the dapp', async ({ device }) => {
  WalletMainScreen.device = device;
  MultiChainTestDapp.device = device;

  await login(device);

  await WalletMainScreen.isMainWalletViewVisible();

  // Launch mobile browser and navigate to the dapp
  await launchMobileBrowser(device);
  await navigateToDapp(
    device,
    'https://metamask.github.io/test-dapp-multichain/latest/',
  );

  // Connect to the dapp
  await MultiChainTestDapp.tapConnectButton();
  // Accept in MetaMask app

  // Accept deeplink if we use deeplinks

  // Check connection status

  await device.pause(20000);
});
