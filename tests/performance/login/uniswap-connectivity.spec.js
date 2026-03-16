import { test } from '../../framework/fixtures/performance/index.ts';
import TimerHelper from '../../framework/TimerHelper.ts';

import { login } from '../../framework/utils/Flows.js';
import {
  switchToMobileBrowser,
  navigateToDapp,
  launchMobileBrowser,
} from '../../framework/utils/MobileBrowser.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import UniswapDapp from '../../../wdio/screen-objects/UniswapDapp.js';
import AndroidScreenHelpers from '../../../wdio/screen-objects/Native/Android.js';
import DappConnectionModal from '../../../wdio/screen-objects/Modals/DappConnectionModal.js';
import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';
import AppwrightHelpers from '../../framework/AppwrightHelpers.ts';
import { unlockIfLockScreenVisible } from '../mm-connect/utils.js';
import { PerformanceLogin } from '../../tags.performance.js';

const UNISWAP_URL = 'https://app.uniswap.org';
const UNISWAP_DAPP_NAME = 'Uniswap';

test.describe(`${PerformanceLogin}`, () => {
  test.setTimeout(180000000);

  test(
    'Connect to Uniswap dapp, edit accounts, choose another account, and skip Solana popup',
    { tag: '@metamask-mobile-platform' },
    async ({ device, performanceTracker }, testInfo) => {
      WalletMainScreen.device = device;
      UniswapDapp.device = device;
      AndroidScreenHelpers.device = device;
      DappConnectionModal.device = device;
      AccountListComponent.device = device;

      const metamaskTimer = new TimerHelper(
        'Time since the user selects Metamask until Metamask app is opened',
        { ios: 15000, android: 20000 },
        device,
      );

      const connectTimer = new TimerHelper(
        'Time since the user taps Connect in MetaMask until Uniswap is displayed',
        { ios: 15000, android: 20000 },
        device,
      );
      await login(device);
      // 1. Login and navigate to Uniswap in the mobile browser
      await AppwrightHelpers.withNativeAction(device, async () => {
        await launchMobileBrowser(device);
        await navigateToDapp(device, UNISWAP_URL, UNISWAP_DAPP_NAME);
      });

      // Wait for Uniswap to fully load before interacting
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // 2. Tap Connect on Uniswap and select MetaMask from the wallet picker
      await AppwrightHelpers.withWebAction(
        device,
        async () => {
          await UniswapDapp.connectWithMetaMask();
        },
        UNISWAP_URL,
      );

      // 3. Click MetaMask in native wallet picker.
      await AppwrightHelpers.withNativeAction(device, async () => {
        await UniswapDapp.tapOnMetaMaskWalletOption();
      });
      metamaskTimer.start();
      // 4. Handle MetaMask connection modal in native context:
      //    - unlock if lock screen is shown
      //    - edit account selection to pick a different account
      //    - tap Connect (timer starts here)
      await AppwrightHelpers.withNativeAction(device, async () => {
        metamaskTimer.stop();
        await unlockIfLockScreenVisible(device);
        await DappConnectionModal.tapEditAccountsButton();
        await DappConnectionModal.tapUpdateAccountsButton();

        await DappConnectionModal.tapConnectButton();
      });
      connectTimer.start();
      await switchToMobileBrowser(device);

      await AppwrightHelpers.withNativeAction(
        device,
        async () => {
          await UniswapDapp.isUniswapDisplayed();
        },
        UNISWAP_URL,
      );
      connectTimer.stop();

      performanceTracker.addTimers(metamaskTimer, connectTimer);
      await performanceTracker.attachToTest(testInfo);
    },
  );
});
