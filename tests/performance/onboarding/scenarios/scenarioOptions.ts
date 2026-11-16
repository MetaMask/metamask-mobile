import {
  onboardingFlowImportSRPPlaywright,
  selectAccountByDevice,
} from '../../../flows/wallet.flow';
import {
  ONBOARDING_CHECKS,
  ONBOARDING_STEPS,
  secretEnv,
  seedlessOptions,
} from './onboardingScenarioSteps';
import PerpsMarketDetailsView from '../../../page-objects/Perps/PerpsMarketDetailsView';
import PerpsMarketListView from '../../../page-objects/Perps/PerpsMarketListView';
import PerpsOrderView from '../../../page-objects/Perps/PerpsOrderView';
import WalletView from '../../../page-objects/wallet/WalletView';
import {
  dismissPerpsOnboardingTutorialIfPresent,
  isPositionOpen,
} from '../../../flows/perps.flow';
import type { ScenarioTestOptions } from '../../../framework/scenario-agent/scenarioTest';

const onboarding = (
  extra: ScenarioTestOptions = {},
): ScenarioTestOptions => ({
  codeSteps: ONBOARDING_STEPS,
  codeChecks: ONBOARDING_CHECKS,
  ...extra,
});

/**
 * Per-scenario code paths, skips and required secrets for onboarding,
 * including the seedless builds. Keyed by the Markdown file name.
 */
export const ONBOARDING_SCENARIO_OPTIONS: Record<string, ScenarioTestOptions> =
  {
    'cold-start-after-wallet-import.scenario.md': onboarding({
      requiredEnv: ['TEST_SRP_3'],
    }),
    'cold-start-to-onboarding.scenario.md': onboarding(),
    'fresh-srp-wallet-creation.scenario.md': onboarding(),
    'imported-wallet-account-creation.scenario.md': onboarding({
      requiredEnv: ['TEST_SRP_2'],
      skip: 'Skipped like the original (test.skip in imported-wallet-account-creation.spec.ts)',
    }),
    'import-wallet.scenario.md': onboarding({ requiredEnv: ['TEST_SRP_3'] }),
    'money-home-empty.scenario.md': onboarding({ requiredEnv: ['TEST_SRP_1'] }),
    'money-home-funded.scenario.md': onboarding({
      requiredEnv: ['TEST_SRP_3'],
    }),
    'new-wallet-account-creation.scenario.md': onboarding(),
    'perps-position-management.scenario.md': {
      skip: 'Places a real perps order; needs explicit user approval to run',
      requiredEnv: ['TEST_SRP_4'],
      codeSteps: {
        'Import the SRP 4 wallet in onboarding and select the account for this device':
          async ({ currentDeviceDetails }) => {
            await onboardingFlowImportSRPPlaywright(secretEnv('TEST_SRP_4'));
            // Perps needs one account per device so parallel runs do not clash.
            await selectAccountByDevice(
              currentDeviceDetails.deviceName as string,
            );
          },
        'Scroll to and tap the Perpetuals section on the wallet home': () =>
          WalletView.scrollAndTapPerpsSection(),
        'Dismiss the Perps tutorial if present': () =>
          dismissPerpsOnboardingTutorialIfPresent(),
        'Tap the BTC market row': () =>
          PerpsMarketListView.tapMarketRowItemBTC(),
        'Close an already open position if there is one': async () => {
          if (await isPositionOpen()) {
            try {
              await PerpsMarketDetailsView.closePositionWithRetry();
            } catch (error) {
              console.error('Error closing existing position:', error);
            }
          }
        },
        'Tap Long on the market details': () =>
          PerpsMarketDetailsView.tapLongButton(),
        'Set 40x leverage and 10 USD and place the order with real funds':
          async () => {
            await PerpsOrderView.setLeverageAppium(40);
            await PerpsOrderView.setAmountUSD('10');
            await PerpsOrderView.tapPlaceOrder();
          },
        'Close the position': async () => {
          try {
            await PerpsMarketDetailsView.closePositionWithRetry();
          } catch (error) {
            console.error('Error closing position:', error);
          }
        },
      },
    },
    'seedless-apple-onboarding.scenario.md': {
      ...seedlessOptions('apple'),
      skip: 'known app failure',
    },
    'seedless-google-onboarding.scenario.md': {
      ...seedlessOptions('google'),
      skip: 'known app failure',
    },
    'seedless-telegram-onboarding.scenario.md': {
      ...seedlessOptions('telegram'),
      skip: 'known app failure',
    },
  };
