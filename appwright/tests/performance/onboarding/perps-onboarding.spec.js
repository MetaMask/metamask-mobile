import { test } from '../../../fixtures/performance-test.js';

import TimerHelper from '../../../utils/TimersHelper.js';
import OnboardingSheet from '../../../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import ImportFromSeedScreen from '../../../../wdio/screen-objects/Onboarding/ImportFromSeedScreen.js';
import CreatePasswordScreen from '../../../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import TabBarModal from '../../../../wdio/screen-objects/Modals/TabBarModal.js';
import WalletActionModal from '../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import PerpsTutorialScreen from '../../../../wdio/screen-objects/PerpsTutorialScreen.js';
import PerpsMarketListView from '../../../../wdio/screen-objects/PerpsMarketListView.js';
import PerpsTabView from '../../../../wdio/screen-objects/PerpsTabView.js';
import PerpsDepositScreen from '../../../../wdio/screen-objects/PerpsDepositScreen.js';
import { onboardingFlowImportSRP } from '../../../utils/Flows.js';

async function screensSetup(device) {
  const screens = [
    OnboardingSheet,
    ImportFromSeedScreen,
    CreatePasswordScreen,
    WalletMainScreen,
    TabBarModal,
    WalletActionModal,
    PerpsTutorialScreen,
    PerpsMarketListView,
    PerpsTabView,
    PerpsDepositScreen,
  ];
  screens.forEach((screen) => {
    screen.device = device;
  });
}

/* Scenario 5: Perps onboarding + add funds 10 USD ARB.USDC */
// TODO: Fix this test: https://consensyssoftware.atlassian.net/browse/MMQA-1190
test.skip('Perps onboarding + add funds 10 USD ARB.USDC', async ({
  device,
  performanceTracker,
}, testInfo) => {
  test.setTimeout(10 * 60 * 1000); // 10 minutes
  await screensSetup(device);

  await onboardingFlowImportSRP(device, process.env.TEST_SRP_3);
  await WalletMainScreen.isTokenVisible('ETH');
  await TabBarModal.tapTradeButton();

  // Open Perps tab
  await TimerHelper.withTimer(
    performanceTracker,
    'Open Perps tab',
    async () => {
      await PerpsTabView.tapPerpsTab();
      await PerpsTutorialScreen.expectFirstScreenVisible();
    },
  );
  // Open Tutorial flow
  await PerpsTutorialScreen.flowTapContinueTutorial(6);

  // Open Add Funds flow
  await TimerHelper.withTimer(
    performanceTracker,
    'Open Add Funds',
    async () => {
      await PerpsTutorialScreen.tapAddFunds();
      await PerpsDepositScreen.isAmountInputVisible();
    },
  );
  // Select pay token
  await TimerHelper.withTimer(
    performanceTracker,
    'Select pay token - 1 click USDC.arb',
    async () => {
      await PerpsDepositScreen.tapPayWith();
      await PerpsDepositScreen.selectPayTokenByText('USDC');
    },
  );

  // Fill amount
  await TimerHelper.withTimer(
    performanceTracker,
    'Fill amount - 10 USD',
    async () => {
      await PerpsDepositScreen.fillUsdAmount('10');
    },
  );

  // Cancel
  await TimerHelper.withTimer(
    performanceTracker,
    'Cancel - 1 click',
    async () => {
      await PerpsDepositScreen.tapCancel();
    },
  );

  await performanceTracker.attachToTest(testInfo);
});
