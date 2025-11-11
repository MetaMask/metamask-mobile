import { test } from 'appwright';
import AppwrightHelpers from '../../../e2e/framework/AppwrightHelpers';

test.skip('MM Connect: Boilerplate Test', async ({ device }) => {
  const dappUrl = 'http://URL_TO_THE_DAPP/';

  // Switch to native context to inspect MetaMask
  await AppwrightHelpers.switchToNativeContext(device);

  // Switch to webview context to inspect the dapp
  await AppwrightHelpers.switchToWebViewContext(device, dappUrl);
});
