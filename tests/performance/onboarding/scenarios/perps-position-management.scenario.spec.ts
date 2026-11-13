/* eslint-disable import-x/no-nodejs-modules -- resolves the scenario next to this spec */
import path from 'path';
import {
  onboardingFlowImportSRPPlaywright,
  selectAccountByDevice,
} from '../../../flows/wallet.flow.js';
import PerpsMarketListView from '../../../page-objects/Perps/PerpsMarketListView.js';
import PerpsMarketDetailsView from '../../../page-objects/Perps/PerpsMarketDetailsView.js';
import PerpsOrderView from '../../../page-objects/Perps/PerpsOrderView.js';
import {
  dismissPerpsOnboardingTutorialIfPresent,
  isPositionOpen,
} from '../../../flows/perps.flow.js';
import WalletView from '../../../page-objects/wallet/WalletView.js';
import { scenarioTest } from '../../login/scenarios/scenarioTest';
import { secretEnv } from './onboardingScenarioSteps';

// Tagged @PerformanceShadow in the scenario file; never picked up by scheduled CI.
// Places a real perps order with TEST_SRP_4 funds: registered as skipped until
// the user explicitly approves a run (then drop `skip` locally).
scenarioTest(
  path.join(__dirname, 'perps-position-management.scenario.md'),
  [],
  {
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
      'Tap the BTC market row': () => PerpsMarketListView.tapMarketRowItemBTC(),
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
);
