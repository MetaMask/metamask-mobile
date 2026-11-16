import AppiumContextHelpers from '../../../framework/AppiumContextHelpers';
import DappConnectionModal from '../../../page-objects/MMConnect/DappConnectionModal';
import UniswapDapp from '../../../page-objects/MMConnect/UniswapDapp';
import { unlockIfLockScreenVisible } from '../../../flows/wallet.flow';
import {
  launchMobileBrowser,
  navigateToDapp,
  switchToMobileBrowser,
} from '../../../flows/native-browser.flow';
import type { ScenarioTestOptions } from '../../../framework/scenario-agent/scenarioTest';

const UNISWAP_URL = 'https://app.uniswap.org';

/**
 * Per-scenario code paths, skips and required secrets. Keyed by the
 * Markdown file name. Scenarios that only need the built-in login path are
 * absent.
 */
export const LOGIN_SCENARIO_OPTIONS: Record<string, ScenarioTestOptions> = {
  'import-multiple-srps.scenario.md': { requiredEnv: ['TEST_SRP_2'] },
  'uniswap-interaction.scenario.md': {
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
  },
};
