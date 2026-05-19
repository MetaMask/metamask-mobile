import { test as perfTest } from '../../framework/fixture';
import TimerHelper from '../../framework/TimerHelper';
import UniswapDapp from '../../page-objects/MMConnect/UniswapDapp';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal';
import { unlockIfLockScreenVisible } from '../mm-connect/utils';
import { PerformanceLogin } from '../../tags.performance.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers';
import {
  launchMobileBrowser,
  navigateToDapp,
  switchToMobileBrowser,
} from '../../flows/native-browser.flow';

const UNISWAP_URL = 'https://app.uniswap.org';

perfTest.describe(`${PerformanceLogin}`, () => {
  perfTest.setTimeout(10 * 60 * 1000);

  perfTest(
    'Connect to Uniswap dapp, edit accounts, choose another account, and skip Solana popup',
    { tag: '@metamask-mobile-platform' },
    async ({ currentDeviceDetails, driver: _driver, performanceTracker }) => {
      const { platform } = currentDeviceDetails;

      const metamaskTimer = new TimerHelper(
        'Time since the user selects Metamask until Metamask app is opened',
        { ios: 18000, android: 20000 },
        platform,
      );

      const connectTimer = new TimerHelper(
        'Time since the user taps Connect in MetaMask until Uniswap is displayed',
        { ios: 15000, android: 20000 },
        platform,
      );
      await loginToAppPlaywright();

      await PlaywrightContextHelpers.withNativeAction(async () => {
        await launchMobileBrowser();
        await navigateToDapp(UNISWAP_URL);
      });

      // Wait for Uniswap to fully load before interacting
      await new Promise((resolve) => setTimeout(resolve, 5000));

      if (platform === 'android') {
        await PlaywrightContextHelpers.withWebAction(async () => {
          await UniswapDapp.connectWithMetaMask();
        }, UNISWAP_URL);
      } else {
        await PlaywrightContextHelpers.withNativeAction(async () => {
          await UniswapDapp.connectIOS();
          await UniswapDapp.selectWalletConnectOption();
        });
      }

      // Android comes from a webAction so needs to be in native context
      if (platform === 'android') {
        await PlaywrightContextHelpers.withNativeAction(async () => {
          await UniswapDapp.tapOnMetaMaskWalletOptionAndOpenDeeplink();
        });
      } else {
        // iOS comes from a nativeAction so no need to change context
        await UniswapDapp.tapOnMetaMaskWalletOptionAndOpenDeeplink();
      }

      metamaskTimer.start();

      // Still on Native Context
      await unlockIfLockScreenVisible();
      metamaskTimer.stop();
      await DappConnectionModal.tapEditAccountsButton();
      await DappConnectionModal.tapUpdateAccountsButton();

      await DappConnectionModal.tapConnectButton({
        shouldCooldown: true,
        timeToCooldown: 2000,
      });

      connectTimer.start();

      await switchToMobileBrowser();

      if (platform === 'android') {
        await UniswapDapp.isUniswapDisplayed();
      }

      connectTimer.stop();

      performanceTracker.addTimers(metamaskTimer, connectTimer);
    },
  );
});
