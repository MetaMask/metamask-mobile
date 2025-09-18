import { test } from '../../fixtures/performance-test.js';

import TimerHelper from '../../utils/TimersHelper.js';
import WelcomeScreen from '../../../wdio/screen-objects/Onboarding/OnboardingCarousel.js';
import TermOfUseScreen from '../../../wdio/screen-objects/Modals/TermOfUseScreen.js';
import OnboardingScreen from '../../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import CreateNewWalletScreen from '../../../wdio/screen-objects/Onboarding/CreateNewWalletScreen.js';
import MetaMetricsScreen from '../../../wdio/screen-objects/Onboarding/MetaMetricsScreen.js';
import OnboardingSucessScreen from '../../../wdio/screen-objects/OnboardingSucessScreen.js';
import OnboardingSheet from '../../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import ImportFromSeedScreen from '../../../wdio/screen-objects/Onboarding/ImportFromSeedScreen.js';
import CreatePasswordScreen from '../../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import TabBarModal from '../../../wdio/screen-objects/Modals/TabBarModal.js';
import WalletActionModal from '../../../wdio/screen-objects/Modals/WalletActionModal.js';
import AppwrightSelectors from '../../../wdio/helpers/AppwrightSelectors.js';
import PerpsTutorialScreen from '../../../wdio/screen-objects/PerpsTutorialScreen.js';
import PerpsMarketListView from '../../../wdio/screen-objects/PerpsMarketListView.js';
import PerpsTabView from '../../../wdio/screen-objects/PerpsTabView.js';
import PerpsDepositScreen from '../../../wdio/screen-objects/PerpsDepositScreen.js';
import { onboardingFlowImportSRP } from '../../utils/Flows.js';

test('Perps onboarding + add funds 10 USD ARB.USDC', async ({
  device,
  performanceTracker,
}, testInfo) => {
  WelcomeScreen.device = device;
  TermOfUseScreen.device = device;
  OnboardingScreen.device = device;
  CreateNewWalletScreen.device = device;
  MetaMetricsScreen.device = device;
  OnboardingSucessScreen.device = device;
  OnboardingSheet.device = device;
  ImportFromSeedScreen.device = device;
  CreatePasswordScreen.device = device;
  WalletMainScreen.device = device;
  TabBarModal.device = device;
  WalletActionModal.device = device;
  PerpsTutorialScreen.device = device;
  PerpsMarketListView.device = device;
  PerpsTabView.device = device;
  PerpsDepositScreen.device = device;

  await onboardingFlowImportSRP(device, process.env.TEST_SRP_3);

  await TabBarModal.tapActionButton();

  const openPerpsTimer = new TimerHelper('Open Perps tab');

  openPerpsTimer.start();
  await PerpsTabView.tapPerpsTab();

  openPerpsTimer.stop();
  performanceTracker.addTimer(openPerpsTimer);

  const tutorialTimer = new TimerHelper('Tutorial flow');

  tutorialTimer.start();
  // Ensure we are on the first tutorial screen
  await PerpsTutorialScreen.expectFirstScreenVisible();
  await PerpsTutorialScreen.tapContinueTutorial(5);

  // Tap Add Funds in the last tutorial slide
  await PerpsTutorialScreen.tapAddFunds();

  tutorialTimer.stop();
  performanceTracker.addTimer(tutorialTimer);

  const openAddFundsTimer = new TimerHelper('Add funds flow Total time');
  openAddFundsTimer.start();

  await PerpsDepositScreen.isAmountInputVisible();

  const openPayWithTimer = new TimerHelper('Select pay token - 1 click');
  openPayWithTimer.start();
  await PerpsDepositScreen.openPayWith();

  await PerpsDepositScreen.selectPayTokenByText('0xa4b1', 'USDC');
  openPayWithTimer.stop();
  performanceTracker.addTimer(openPayWithTimer);
  await PerpsDepositScreen.fillUsdAmount('10');

  await PerpsDepositScreen.tapContinue();

  await PerpsDepositScreen.tapCancel();

  openAddFundsTimer.stop();
  performanceTracker.addTimer(openAddFundsTimer);

  await performanceTracker.attachToTest(testInfo);
});
