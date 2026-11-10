/* eslint-disable import-x/no-nodejs-modules -- resolves the scenario next to this spec */
import path from 'path';
import UniswapDapp from '../../../page-objects/MMConnect/UniswapDapp';
import DappConnectionModal from '../../../page-objects/MMConnect/DappConnectionModal';
import { unlockIfLockScreenVisible } from '../../../flows/wallet.flow';
import AppiumContextHelpers from '../../../framework/AppiumContextHelpers';
import {
  launchMobileBrowser,
  navigateToDapp,
  switchToMobileBrowser,
} from '../../../flows/native-browser.flow';
import { scenarioTest } from './scenarioTest';

const UNISWAP_URL = 'https://app.uniswap.org';

// Tagged @PerformanceShadow in the scenario file; never picked up by scheduled CI.
// Skipped like the original (perfTest.skip in uniswap-interaction.spec.ts).
scenarioTest(path.join(__dirname, 'uniswap-interaction.scenario.md'), [], {
  skip: 'The original uniswap-interaction.spec.ts is perfTest.skip',
  codeSteps: {
    'Open Uniswap in the mobile browser and start Connect with MetaMask':
      async () => {
        await AppiumContextHelpers.withNativeAction(async () => {
          await launchMobileBrowser();
          await navigateToDapp(UNISWAP_URL);
        });
        // Same fixed wait as the original before interacting with Uniswap.
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await AppiumContextHelpers.withWebAction(async () => {
          await UniswapDapp.connectWithMetaMask();
        }, UNISWAP_URL);
      },
    'Pick MetaMask in the Uniswap wallet list and open the deeplink': () =>
      AppiumContextHelpers.withNativeAction(async () => {
        await UniswapDapp.tapOnMetaMaskWalletOptionAndOpenDeeplink();
      }),
    'Edit accounts, update them and tap Connect in MetaMask': async () => {
      await DappConnectionModal.tapEditAccountsButton();
      await DappConnectionModal.tapUpdateAccountsButton();
      await DappConnectionModal.tapConnectButton({
        shouldCooldown: true,
        timeToCooldown: 2000,
      });
    },
  },
  codeChecks: {
    'unlock-if-lock-screen': () => unlockIfLockScreenVisible(),
    'uniswap-displayed': async () => {
      await switchToMobileBrowser();
      await UniswapDapp.isUniswapDisplayed();
    },
  },
});
