import { test } from 'appwright';

import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import AppwrightGestures from '../../../e2e/framework/AppwrightGestures.js';
import { login } from '../../utils/Flows.js';
// eslint-disable-next-line import/no-nodejs-modules
import { spawn } from 'child_process';

const MULTI_CHAIN_TEST_DAPP_URL = 'https://test.cursedlab.xyz/';
const MULTI_CHAIN_TEST_DAPP_NAME = 'Multichain Test Dapp';

test('@metamask/sdk-connect - Connect to the dapp', async ({ device }) => {
  WalletMainScreen.device = device;
  //   await login(device)

  console.log('Going now!');

  await AppwrightGestures.switchContext(
    device,
    'WEBVIEW',
    MULTI_CHAIN_TEST_DAPP_URL,
  );

  await new Promise((resolve) => setTimeout(resolve, 30000));
  await new Promise((resolve) => setTimeout(resolve, 30000));
  await new Promise((resolve) => setTimeout(resolve, 30000));
  await new Promise((resolve) => setTimeout(resolve, 30000));
});
