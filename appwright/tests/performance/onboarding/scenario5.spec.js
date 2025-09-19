import { test } from '../../../fixtures/performance-test.js';

import TimerHelper from '../../../utils/TimersHelper.js';
import WelcomeScreen from '../../../../wdio/screen-objects/Onboarding/OnboardingCarousel.js';
import TermOfUseScreen from '../../../../wdio/screen-objects/Modals/TermOfUseScreen.js';
import OnboardingScreen from '../../../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import CreateNewWalletScreen from '../../../../wdio/screen-objects/Onboarding/CreateNewWalletScreen.js';
import MetaMetricsScreen from '../../../../wdio/screen-objects/Onboarding/MetaMetricsScreen.js';
import OnboardingSucessScreen from '../../../../wdio/screen-objects/OnboardingSucessScreen.js';
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
import { login, onboardingFlowImportSRP } from '../../../utils/Flows.js';

async function screensSetup(device) {
  const screens = [
    WelcomeScreen,
    TermOfUseScreen,
    OnboardingScreen,
    CreateNewWalletScreen,
    MetaMetricsScreen,
    OnboardingSucessScreen,
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

test('Perps onboarding + add funds 10 USD ARB.USDC', async ({
  device,
  performanceTracker,
}, testInfo) => {
  await screensSetup(device);

  await onboardingFlowImportSRP(device, process.env.TEST_SRP_2, 120000);

  await TabBarModal.tapActionButton();

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
  await PerpsTutorialScreen.flowTapContinueTutorial(5);

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
      await PerpsDepositScreen.selectPayTokenByText('0xa4b1', 'USDC');
    },
  );

  // Fill amount
  await TimerHelper.withTimer(
    performanceTracker,
    'Fill amount - 10 USD',
    async () => {
      await PerpsDepositScreen.fillUsdAmount('10');
      await PerpsDepositScreen.tapContinue();
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
