import { test } from 'appwright';

import { login } from '../../utils/Flows.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';

test('@metamask/sdk-connect - IOSSafari test', async ({ device }) => {
  WalletMainScreen.device = device;

  await login(device);

  await WalletMainScreen.isMainWalletViewVisible();

  // POC using safari
  await device.activateApp('com.apple.mobilesafari');

  // Connect to the dapp

  // Accept in MetaMask app

  // Accept deeplink if we use deeplinks

  // Check connection status

  await device.pause(20000);
});
