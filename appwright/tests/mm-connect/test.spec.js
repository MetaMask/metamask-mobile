import { test } from 'appwright';

import { login } from '../../utils/flows/Flows.js';
import { launchMobileBrowser } from '../../utils/flows/MobileBrowser.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import AppwrightSelectors from '../../../e2e/framework/AppwrightSelectors';

test('@metamask/sdk-connect - Connect to the dapp', async ({ device }) => {
  WalletMainScreen.device = device;

  const isAndroid = AppwrightSelectors.isAndroid(device);

  await login(device);

  await WalletMainScreen.isMainWalletViewVisible();

  // Launch mobile browser and navigate to the dapp
  await launchMobileBrowser(device);

  // Connect to the dapp

  // Accept in MetaMask app

  // Accept deeplink if we use deeplinks

  // Check connection status

  await device.pause(20000);
});
